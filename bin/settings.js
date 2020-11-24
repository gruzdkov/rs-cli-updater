const os = require('os')
const path = require('path')

const SETTINGS_PATH = path.resolve(os.homedir(), '.rsupdaterc')

module.exports = {
    SETTINGS_PATH
}