import { OutputChannel, window, workspace } from 'vscode';
import { LogLevel } from '../types/LogTypes';
import { isDebugMode } from './helper';

class Log {
    private readonly outputChannel: OutputChannel;
    public constructor() {
        this.outputChannel = window.createOutputChannel('MJML Editor');
    }

    public verbose(message: string, data?: any): void {
        this.log(LogLevel.Verbose, message, data);
    }

    public info(message: string, data?: any): void {
        this.log(LogLevel.Info, message, data);
    }

    public warn(message: string, data?: any): void {
        this.log(LogLevel.Warn, message, data);
    }

    public error(message: string, data?: any): void {
        this.log(LogLevel.Error, message, data);
    }

    public log(level: LogLevel, message: string, data?: any): void {
        let logLevel = LogLevel.Info;
        if (isDebugMode()) {
            logLevel = LogLevel.Verbose;
        }

        if (level >= logLevel) {
            this.outputChannel.appendLine(`[${LogLevel[level]} - ${(new Date().toLocaleTimeString())}] ${message}`);
            if (data) {
                this.outputChannel.appendLine(this.data2String(data, level === LogLevel.Verbose));
            }

            if (level === LogLevel.Error) {
                window.showErrorMessage(data ? `${message} Details: ${this.data2String(data)}` : message);
            }
        }
    }

    private data2String(data: any, verbose = false): string {
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
}

const Logger = new Log();
export default Logger;