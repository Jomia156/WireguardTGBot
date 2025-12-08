import dotenv from "dotenv";
dotenv.config()

const envPattern = {
    TOKEN: 1,
    wgParams: 1,
    wgConf: 1,
    peersDir: 1,
}

const setupENV = function () {
    try {
        if (process.env.ENV_MODE === "DEV") dotenv.config({ path: ".env.development" });
        else if (process.env.ENV_MODE === "PROD") dotenv.config({ path: ".env.development" })
        else {
            throw new Error("ENV_MODE is undefined. Set DEV/PROD mode.")

        }
        envChecker()
    }
    catch (err: any) {
        console.error(err)
    }
}

function envChecker() {
    Object.keys(envPattern).forEach(key => {
        if (!process.env[key]) throw new Error(`ENV.${key} don't found.`)
    })
} 


export default setupENV()