export class CustomError extends Error {

    public msg:string;

    constructor(msg:string, ...args:any) {
        super()

        this.msg = msg
    }


}