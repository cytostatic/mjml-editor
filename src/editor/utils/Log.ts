import { messageHandler } from '@estruyf/vscode/dist/client';
import { LogLevel } from "../../types/LogTypes";
import { Events } from "../../types/EventTypes";

export class Log {

    private static data2String(data: any, verbose = false): string {
        if (data instanceof Error) {
            if (verbose) {
                return `${data.message}\n${data.stack}`;
            }
            return data.message;
        }

        if (typeof data === 'string') {
            return data;
        }

        return JSON.stringify(data, null, 2);
    }

    private static log(level: LogLevel, message: string, data?: any): void {
        messageHandler.send(Events.Logging, {
            level,
            message,
            data: data ? this.data2String(data, level === LogLevel.Verbose) : null,
        });
    }

    public static verbose(message: string, data?: any): void {
        this.log(LogLevel.Verbose, message, data);
    }

    public static info(message: string, data?: any): void {
        this.log(LogLevel.Info, message, data);
    }

    public static warn(message: string, data?: any): void {
        this.log(LogLevel.Warn, message, data);
    }

    public static error(message: string, data?: any): void {
        this.log(LogLevel.Error, message, data);
    }
}
