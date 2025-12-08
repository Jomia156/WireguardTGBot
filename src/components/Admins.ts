import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export type Admin = {
    id:number,
    nickname:string
}

export class Admins {

    private __dirname;

    constructor() {
        this.__dirname = __dirname
    }

    create(id:number, nickname:string):Admin {
        const adminsJSON = this.getAdminsJSON()
        adminsJSON.push({id, nickname})
        this.changeAdminsJSON(adminsJSON)
        return {id, nickname}
    }

    check(id:number):boolean {
        const adminsJSON = this.getAdminsJSON()
        for (let i=0; i<adminsJSON.length; i++) {
            if (adminsJSON[i]?.id == id) return true
        }
        return false
    }

    getAdmin(id:number):Admin {
        const adminsJSON = this.getAdminsJSON()
        let reqAdmin = {id:0, nickname:""}
        adminsJSON.forEach(admin=>{
            if (admin.id==id) reqAdmin = admin
        })
        return reqAdmin
    }

    removeAdmin(id:number) {
        let adminsJSON = this.getAdminsJSON()
        adminsJSON = adminsJSON.filter(i=>i.id!=id)
        this.changeAdminsJSON(adminsJSON)
    }

    getAdminsJSON():Array<Admin> {
        return JSON.parse(String(readFileSync((path.join(this.__dirname, "../../admins.json")))))
    }

    changeAdminsJSON(data:Array<Admin>) {
        writeFileSync((path.join(this.__dirname, "../../admins.json")), JSON.stringify(data))
    }

}