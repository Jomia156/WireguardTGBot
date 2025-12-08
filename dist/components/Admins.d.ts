export type Admin = {
    id: number;
    nickname: string;
};
export declare class Admins {
    private __dirname;
    constructor();
    create(id: number, nickname: string): Admin;
    check(id: number): boolean;
    getAdmin(id: number): Admin;
    removeAdmin(id: number): void;
    getAdminsJSON(): Array<Admin>;
    changeAdminsJSON(data: Array<Admin>): void;
}
//# sourceMappingURL=Admins.d.ts.map