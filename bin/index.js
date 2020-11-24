#!/usr/bin/env node

const fs = require('fs')
const puppeteer = require('puppeteer')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const { SETTINGS_PATH } = require('./settings.js')

const argv = yargs(hideBin(process.argv)).argv._
const [projectName, action, param] = argv

if (!projectName) {
    console.log('Непонятно с каким проектом работать! 😤')
    return
}

if (!action) {
    console.log('Непонятно что ты хочешь сделать с проектом! 😤')
    return
}

if (action === 'switch' && !param) {
    console.log('Непонятно на какую ветку переключиться, укажи ее! 😤')
    return
}

function getSettings() {
    try {
        const settingsFile = fs.readFileSync(SETTINGS_PATH, 'utf-8')

        return JSON.parse(settingsFile)
    } catch (error) {
        console.log(`Не удалось получить настройки из ~/.rsupdaterc
        Тут можно взять примеры https://www.notion.so/cli-ci-5704afa792e64453bb6bbdc683b04ff7 (только надо убрать комменты, должен быть валидный JSON)
        Удачи!🤝`)
    }
}

function getSettingsForProject() {
    const settings = getSettings()
    const projectSettings = settings.projects.find(i => i.project === projectName)

    return projectSettings
}

async function updateProject() {
    const settings = getSettingsForProject()
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    const basicAuthCreds = settings.basic_auth_creds || getSettings().basic_auth_creds

    if (!settings.skip_basic_auth) await page.authenticate(
        { 'username': basicAuthCreds[0], 'password': basicAuthCreds[1] }
    )

    await page.goto(settings.url)
    console.log('Логинимся...🧞‍♀️')
    await page.$eval('input[name=LOGIN]', (el, value) => el.value = value, settings.username)
    await page.$eval('input[name=PASS]', (el, value) => el.value = value, settings.password)
    await page.$eval('.login_logout.btn-block', (button) => button.click())
    await page.waitForSelector('form[data-action="PULL"]')
    console.log('Залогинились, сейчас спуллю...🧞')
    await page.$eval('form[data-action="PULL"] button', (button) => button.click())
    await page.waitForSelector('.levo_prelevo#mask')
    console.log('Спуллено! 🧞‍♂️')
    const resultConsoleElem = await page.$("#cnsl");
    const resultText = await page.evaluate(element => element.value, resultConsoleElem);
    console.log(resultText)
    await browser.close()
}

async function fetchProject() {
    const settings = getSettingsForProject()
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    const basicAuthCreds = settings.basic_auth_creds || getSettings().basic_auth_creds

    if (!settings.skip_basic_auth) await page.authenticate(
        { 'username': basicAuthCreds[0], 'password': basicAuthCreds[1] }
    )

    try {
        await page.goto(settings.url)
        console.log('Логинимся...🧞‍♀️')
        await page.$eval('input[name=LOGIN]', (el, value) => el.value = value, settings.username)
        await page.$eval('input[name=PASS]', (el, value) => el.value = value, settings.password)
        await page.$eval('.login_logout.btn-block', (button) => button.click())
        await page.waitForSelector('form[data-action="PULL"]')
        console.log('Залогинились, сейчас буду фетчить...🧞')
        await page.$eval('form[data-action="FETCH"] button', (button) => button.click())
        await page.waitForSelector('.levo_prelevo#mask')
        console.log('Нафетчил! Получите, распишитесь🧞‍♂️')
        const resultConsoleElem = await page.$("#cnsl");
        const resultText = await page.evaluate(element => element.value, resultConsoleElem);
        console.log(resultText)

    } catch (e) {
        console.log('Увы, но на этом проекте фетч недоступен😞 Давай-ка ручками')
    } finally {
        await browser.close()
    }
}


async function switchProjectBranch() {
    const settings = getSettingsForProject()
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    const basicAuthCreds = settings.basic_auth_creds || getSettings().basic_auth_creds

    if (!settings.skip_basic_auth) await page.authenticate(
        { 'username': basicAuthCreds[0], 'password': basicAuthCreds[1] }
    )

    try {
        await page.goto(settings.url)
        console.log('Логинимся...🧞‍♀️')
        await page.$eval('input[name=LOGIN]', (el, value) => el.value = value, settings.username)
        await page.$eval('input[name=PASS]', (el, value) => el.value = value, settings.password)
        await page.$eval('.login_logout.btn-block', (button) => button.click())
        await page.waitForSelector('form[data-action="PULL"]')
        console.log('Залогинились, сейчас буду переключать ветку...🧞')
        await page.$eval('a[href="#tab_git"]', (tabLink) => tabLink.click())
        await page.waitForSelector('.levo_prelevo#mask')
        await page.waitForSelector('#branch')

        if (await page.$(`#branch option[value="${param}"`) !== null) {
            await page.select('#branch', param)
            console.log(`Ветка переключена на ${param}. Сейчас спуллю🧞‍♀️`)
        } else if (await page.$(`#branch option[value="remotes/origin/${param}"`) !== null) {
            await page.select('#branch', `remotes/origin/${param}`)
            console.log(`Ветка переключена на remotes/origin/${param}. Сейчас спуллю🧞‍♀️`)
        } else {
            throw new Error('No branch')
        }

        await page.waitForSelector('.levo_prelevo#mask')
        await page.$eval('a[href="#tab_main"]', (tabLink) => tabLink.click())
        await page.$eval('form[data-action="PULL"] button', (button) => button.click())
        await page.waitForSelector('.levo_prelevo#mask')
        console.log('Спуллено! 🧞‍♂️')
        const resultConsoleElem = await page.$("#cnsl");
        const resultText = await page.evaluate(element => element.value, resultConsoleElem);
        console.log(resultText)
        console.log(`Проект успешно переключен на ветку ${param}! 🧞‍♂️`)
    } catch (e) {
        console.log(`Увы, но на ветку "${param}" переключиться не удалось 😞 Давай-ка ручками, или попробуй fetch перед переключением веток`)
    } finally {
        await browser.close()
    }
}

if (!getSettingsForProject()) {
    console.log(`
        Не найдены настройки для проекта "${projectName}". Опиши их в ~/.rsupdaterc
        Тут можно взять примеры https://www.notion.so/cli-ci-5704afa792e64453bb6bbdc683b04ff7 (только надо убрать комменты, должен быть валидный JSON)
        Удачи!🤝
    `)
    return
}

switch (action) {
    case 'update': return updateProject()
    case 'fetch': return fetchProject()
    case 'switch': return switchProjectBranch()
    default: console.log(`Я не умею ${action}! Попроси кого-то другого😩`)
}