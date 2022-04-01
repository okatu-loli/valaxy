#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

// @ts-check
const fs = require('fs')
const path = require('path')
const argv = require('minimist')(process.argv.slice(2))
const prompts = require('prompts')
const execa = require('execa')
const chalk = require('chalk')
const { version } = require('./package.json')

const cwd = process.cwd()

const renameFiles = {
  _gitignore: '.gitignore',
  _npmrc: '.npmrc',
}

async function init() {
  console.log()
  console.log(`  ${chalk.bold('🌌 Valaxy')}  ${chalk.blue(`v${version}`)}`)
  console.log()

  let targetDir = argv._[0]
  if (!targetDir) {
    /**
     * @type {{ projectName: string }}
     */
    const { projectName } = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'valaxy-blog',
    })
    targetDir = projectName.trim()

    const packageName = await getValidPackageName(targetDir)
    const root = path.join(cwd, targetDir)

    if (!fs.existsSync(root)) { fs.mkdirSync(root, { recursive: true }) }
    else {
      const existing = fs.readdirSync(root)
      if (existing.length) {
        console.log(chalk.yellow(`  Target directory "${targetDir}" is not empty.`))
        /**
       * @type {{ yes: boolean }}
       */
        const { yes } = await prompts({
          type: 'confirm',
          name: 'yes',
          initial: 'Y',
          message: 'Remove existing files and continue?',
        })
        if (yes)
          emptyDir(root)

        else
          return
      }
    }

    console.log(chalk.dim('  Scaffolding project in ') + targetDir + chalk.dim(' ...'))

    const templateDir = path.join(__dirname, 'template')
    const write = (file, content) => {
      const targetPath = renameFiles[file]
        ? path.join(root, renameFiles[file])
        : path.join(root, file)
      if (content)
        fs.writeFileSync(targetPath, content)

      else
        copy(path.join(templateDir, file), targetPath)
    }

    const files = fs.readdirSync(templateDir)
    for (const file of files.filter(f => f !== 'package.json'))
      write(file)

    // write pkg name & version
    const pkg = require(path.join(templateDir, 'package.json'))
    pkg.name = packageName
    pkg.version = version

    write('package.json', JSON.stringify(pkg, null, 2))

    const pkgManager = (/pnpm/.test(process.env.npm_execpath) || /pnpm/.test(process.env.npm_config_user_agent))
      ? 'pnpm'
      : /yarn/.test(process.env.npm_execpath) ? 'yarn' : 'npm'

    const related = path.relative(cwd, root)
    console.log(chalk.green('  Done.\n'))

    /**
     * @type {{ yes: boolean }}
     */
    const { yes } = await prompts({
      type: 'confirm',
      name: 'yes',
      initial: 'Y',
      message: 'Install and start it now?',
    })

    if (yes) {
      const { agent } = await prompts({
        name: 'agent',
        type: 'select',
        message: 'Choose the agent',
        choices: ['npm', 'yarn', 'pnpm'].map(i => ({ value: i, title: i })),
      })

      if (!agent)
        return

      console.log('root', root)
      await execa(agent, ['install'], { stdio: 'inherit', cwd: root })
      await execa(agent, ['run', 'dev'], { stdio: 'inherit', cwd: root })
    }
    else {
      console.log(chalk.dim('\n  start it later by:\n'))
      if (root !== cwd)
        console.log(chalk.blue(`  cd ${chalk.bold(related)}`))

      console.log(chalk.blue(`  ${pkgManager === 'yarn' ? 'yarn' : `${pkgManager} install`}`))
      console.log(chalk.blue(`  ${pkgManager === 'yarn' ? 'yarn dev' : `${pkgManager} run dev`}`))
      console.log()
      console.log(`  ${chalk.cyan('✨')}`)
      console.log()
    }
  }
}

function copy(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory())
    copyDir(src, dest)

  else
    fs.copyFileSync(src, dest)
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

async function getValidPackageName(projectName) {
  projectName = path.basename(projectName)
  const packageNameRegExp = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
  if (packageNameRegExp.test(projectName)) {
    return projectName
  }
  else {
    const suggestedPackageName = projectName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/^[._]/, '')
      .replace(/[^a-z0-9-~]+/g, '-')

    /**
     * @type {{ inputPackageName: string }}
     */
    const { inputPackageName } = await prompts({
      type: 'text',
      name: 'inputPackageName',
      message: 'Package name:',
      initial: suggestedPackageName,
      validate: input =>
        packageNameRegExp.test(input) ? true : 'Invalid package.json name',
    })
    return inputPackageName
  }
}

/**
 * @param {string} dir
 * @returns
 */
function emptyDir(dir) {
  if (!fs.existsSync(dir))
    return
  console.log(chalk.red('  Remove ') + chalk.gray(dir))
  fs.rmSync(dir, { recursive: true, force: true })
}

init().catch((e) => {
  console.error(e)
})
