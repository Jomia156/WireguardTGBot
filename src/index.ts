import setupENV from "./components/setupENV.js"
import Bot from "./bot/Bot.js"
import { WGCore } from "./components/wgcore.js"

const wgcore = new WGCore()

setInterval(()=>{
    const peers = wgcore.getPeers()
    let change = false
    Object.keys(peers).forEach(peer=>{
        if (peers[peer].lifetime<Date.now()) {
            wgcore.updatePeer(peers[peer].id, {banned:true});
            change=true
        }
    })
    if (change) {
        wgcore._regenWgConf()
    }
}, 1000*60)

const bot = new Bot(process.env.TOKEN||"") 