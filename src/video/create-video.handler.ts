import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';

import { Video } from './entity/video.entity';
import { User } from 'src/user/entity/user.entity'; // 실제 경로로 수정
import { CreateVideoCommand } from './command/create-video.command';

 @Injectable()
 @CommandHandler(CreateVideoCommand)
 export class CreateVideoHandler implements ICommandHandler<CreateVideoCommand> {
    constructor(private dataSource: DataSource) {}

    async execute(command: CreateVideoCommand): Promise<Video> {
        const { userId, title, mimetype, extension, buffer } = command;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.startTransaction();
        let error;

        try{
            console.log('title::::'+ title);
            console.log('title::::'+ title);
            console.log('title::::'+ title);
            console.log('title::::'+ title);
            console.log('title::::'+ title);
            const user = await queryRunner.manager.findOneBy(User, { id: userId});
            const video = await queryRunner.manager.save(queryRunner.manager.create(Video, {title, mimetype, user}))

            await this.uploadVideo(video.id, extension, buffer);
            await queryRunner.commitTransaction();
            
            return video;
        }catch(e) {
            await queryRunner.rollbackTransaction();
            error = e;
        }finally{
            await queryRunner.release();
            if(error) throw error;
        }
    }

    private async uploadVideo(id: string, extension: string, buffer: Buffer) {
        console.log('upload Video');
    }
 }