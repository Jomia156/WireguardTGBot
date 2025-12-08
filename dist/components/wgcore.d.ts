export type PeerDTO = {
    id: string;
    PrivateKey: string;
    PublicKey: string;
    PresharedKey: string;
    name: string;
    AllowedIPs: string;
    lifetime: number;
    banned: boolean;
};
export type UploadPeerDTO = {
    name?: string;
    lifetime?: string;
    banned?: boolean;
};
export declare class WGCore {
    wgConfHeader: string;
    wgConfPath: string;
    wgServerIp: string;
    wgServerPort: string;
    wgPublicKey: string;
    wgPrivateKey: string;
    __dirname: string;
    lifetimes: {
        "1\u0447": number;
        "1\u0434": number;
        "3\u0434": number;
        "1\u043C": number;
        "1\u0433": number;
        вечный: number;
    };
    constructor();
    genPeerConnectConfig(peer: PeerDTO): Promise<{
        string: string;
        pathConfFile: string;
        pathQRFile: string;
    }>;
    getPeers(): any;
    getPeer(peerId: string): any;
    createPeer(name: string, lifetime: number): PeerDTO;
    updatePeer(peerId: string, data: UploadPeerDTO): void;
    removePeer(peerId: string): void;
    stop(): void;
    start(): void;
    reboot(): void;
    _getNewID(): string;
    _getPeersJSON(): any;
    _changePeersJSON(data: any): void;
    _reloadWGConf(): void;
    _regenWgConf(): void;
    _genPeerKeys(): {
        PrivateKey: string;
        PublicKey: string;
        PresharedKey: string;
    };
    _genPeerConfig(peer: PeerDTO, banned?: boolean): string;
}
//# sourceMappingURL=wgcore.d.ts.map