import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { parse } from "ini";
import { CustomError } from "./CustomError.js";
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class WGCore {
    wgConfHeader;
    wgConfPath;
    wgServerIp;
    wgServerPort;
    wgPublicKey;
    wgPrivateKey;
    __dirname;
    lifetimes = { "1ч": 1000 * 60 * 60, "1д": 1000 * 60 * 60 * 24, "3д": 1000 * 60 * 60 * 24 * 3, "1м": 1000 * 60 * 60 * 24 * 30, "1г": 1000 * 60 * 60 * 24 * 365, "вечный": Date.now() };
    constructor() {
        this.__dirname = __dirname;
        const wgParams = parse(String(readFileSync(path.join(process.env.wgParams || ""))));
        this.wgConfPath = process.env.wgConf || "";
        this.wgConfHeader = readFileSync(path.join(this.wgConfPath)).toString().split("\n\n")[0] + "\n\n" || "";
        this.wgServerIp = wgParams.SERVER_PUB_IP;
        this.wgServerPort = wgParams.SERVER_PORT || "";
        this.wgPublicKey = wgParams.SERVER_PUB_KEY || "";
        this.wgPrivateKey = wgParams.SERVER_PRIV_KEY || "";
        this._regenWgConf();
    }
    async genPeerConnectConfig(peer) {
        let clientConfigString = "[Interface]";
        clientConfigString += "\nPrivateKey = " + peer.PrivateKey;
        clientConfigString += "\nAddress = " + peer.AllowedIPs;
        clientConfigString += "\nDNS = 1.1.1.1,8.8.8.8";
        clientConfigString += "\n\n[Peer]";
        clientConfigString += "\nPublicKey = " + this.wgPublicKey;
        clientConfigString += "\nPresharedKey = " + peer.PresharedKey;
        clientConfigString += "\nEndpoint = " + this.wgServerIp + ":" + this.wgServerPort;
        clientConfigString += "\nAllowedIPs = 0.0.0.0/0,::/0";
        const peerDirPath = path.join(process.env.peersDir || "", peer.id);
        const peerConfFilePath = path.join(peerDirPath, peer.id + ".conf");
        const peerQRFilePath = path.join(peerDirPath, peer.id + ".png");
        if (!existsSync(peerDirPath)) {
            mkdirSync(peerDirPath);
        }
        writeFileSync(peerConfFilePath, clientConfigString);
        await QRCode.toFile(peerQRFilePath, clientConfigString);
        return {
            string: clientConfigString,
            pathConfFile: peerConfFilePath,
            pathQRFile: peerQRFilePath
        };
    }
    getPeers() {
        return this._getPeersJSON();
    }
    getPeer(peerId) {
        let peersJSON = this._getPeersJSON();
        if (!peersJSON[peerId])
            throw new CustomError("Пользователь не найден.");
        return peersJSON[peerId];
    }
    createPeer(name, lifetime) {
        let peersJSON = this._getPeersJSON();
        const newId = this._getNewID();
        if (!newId)
            throw new CustomError("Достигнут лимит пользователей");
        const peer = {
            id: newId,
            name: name,
            AllowedIPs: `10.66.66.${newId}/32,fd42:42:42::${newId}/128`,
            lifetime: Date.now() + lifetime,
            banned: false,
            ...this._genPeerKeys()
        };
        peersJSON[peer.id] = peer;
        this._changePeersJSON(peersJSON);
        this._regenWgConf();
        return peer;
    }
    updatePeer(peerId, data) {
        this.getPeer(peerId);
        let peersJSON = this._getPeersJSON();
        peersJSON[peerId] = { ...peersJSON[peerId], ...data };
        this._changePeersJSON(peersJSON);
        this._regenWgConf();
    }
    removePeer(peerId) {
        this.getPeer(peerId);
        let peersJSON = this._getPeersJSON();
        delete peersJSON[peerId];
        this._changePeersJSON(peersJSON);
        this._regenWgConf();
    }
    stop() {
        execSync("service wg-quick@wg0 stop");
    }
    start() {
        execSync("service wg-quick@wg0 start");
    }
    reboot() {
        execSync("service wg-quick@wg0 restart");
    }
    _getNewID() {
        let peersJSON = JSON.parse(String(readFileSync("./peers.json")));
        let id = 0;
        for (let newId = 2; newId < 255; newId++) {
            if (!peersJSON[String(newId)]) {
                id = newId;
                break;
            }
        }
        return String(id);
    }
    _getPeersJSON() {
        return JSON.parse(String(readFileSync((path.join(this.__dirname, "../../peers.json")))));
    }
    _changePeersJSON(data) {
        writeFileSync((path.join(this.__dirname, "../../peers.json")), JSON.stringify(data));
    }
    _reloadWGConf() {
        if (process.env.ENV_MODE == "DEV")
            return;
        execSync("service wg-quick@wg0 reload");
    }
    _regenWgConf() {
        let config = this.wgConfHeader;
        let peersArray = Object.values(this.getPeers());
        peersArray.forEach((peer) => {
            config += this._genPeerConfig(peer, peer.banned);
        });
        writeFileSync(path.join(this.wgConfPath), config);
        this._reloadWGConf();
    }
    _genPeerKeys() {
        if (process.env.ENV_MODE == "DEV") {
            return {
                PrivateKey: "8IorfN3fZLs1PVSywNZS2g06FUIVKoO3NUqpunDLyGg=",
                PublicKey: "8IorfN3fZLs1PVSywNZS2g06FUIVKoO3NUqpunDLyGg=",
                PresharedKey: "8IorfN3fZLs1PVSywNZS2g06FUIVKoO3NUqpunDLyGg="
            };
        }
        let commandForGenKeys = 'wg genkey | tee private.key | wg pubkey > public.key && cat private.key && cat public.key && wg genpsk && rm public.key private.key';
        let output = execSync(commandForGenKeys).toString();
        return {
            PrivateKey: output.split("\n")[0] || "",
            PublicKey: output.split("\n")[1] || "",
            PresharedKey: output.split("\n")[2] || ""
        };
    }
    _genPeerConfig(peer, banned = false) {
        if (!banned) {
            let peerString = "\n[Peer]";
            peerString += "\nPublicKey=" + peer.PublicKey;
            peerString += "\nPresharedKey=" + peer.PresharedKey;
            peerString += "\nAllowedIPs=" + peer.AllowedIPs;
            return peerString;
        }
        else {
            let peerString = "\n#[Peer]";
            peerString += "\n#PublicKey=" + peer.PublicKey;
            peerString += "\n#PresharedKey=" + peer.PresharedKey;
            peerString += "\n#AllowedIPs=" + peer.AllowedIPs;
            return peerString;
        }
    }
}
//# sourceMappingURL=wgcore.js.map