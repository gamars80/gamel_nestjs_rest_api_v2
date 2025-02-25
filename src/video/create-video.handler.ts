import { Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';

import { Video } from './entity/video.entity';
import { User } from 'src/user/entity/user.entity'; // 실제 경로로 수정
import { CreateVideoCommand } from './command/create-video.command';
import { VideoCreatedEvent } from './event/video-created.event';
import { join } from 'path';
import { writeFile } from 'fs/promises';


 @Injectable()
 @CommandHandler(CreateVideoCommand)
 export class CreateVideoHandler implements ICommandHandler<CreateVideoCommand> {
    constructor(private dataSource: DataSource, private eventBus: EventBus) {}

    async execute(command: CreateVideoCommand): Promise<Video> {
        const { userId, title, mimetype, extension, buffer } = command;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.startTransaction();
        let error;

        try{

            const user = await queryRunner.manager.findOneBy(User, { id: userId});
            const video = await queryRunner.manager.save(queryRunner.manager.create(Video, {title, mimetype, user}))

            await this.uploadVideo(video.id, extension, buffer);
            await queryRunner.commitTransaction();
            this.eventBus.publish(new VideoCreatedEvent(video.id));
            
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
        const filePath = join(process.cwd(), 'video-storage', `${id}.${extension}`);
        await writeFile(filePath, buffer);
    }
 }