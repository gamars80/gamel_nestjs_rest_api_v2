import { Injectable, NestMiddleware, Logger, Inject, LoggerService } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { mergeWith } from "rxjs";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(@Inject(Logger) private readonly logger: LoggerService) {}

    use(request: Request, response: Response, next: NextFunction): void {
        const {ip, method, originalUrl: url } = request;
        const userAgent = request.get('user-agent') || '';

        response.on('close', () => {
            const { statusCode } = response;
            const contentLength = response.get('content-length');
            this.logger.log(`${mergeWith} ${url}, ${statusCode}, ${contentLength} - ${userAgent} ${ip}}`);
        });

        next();
    }

}