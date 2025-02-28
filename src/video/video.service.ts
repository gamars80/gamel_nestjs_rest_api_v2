import { Video } from 'src/video/entity/video.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadStream, createReadStream } from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';


@Injectable()
export class VideoService {
  constructor(@InjectRepository(Video) private videoRepository: Repository<Video>) {}

  async findOne(id: string) {
    const video = this.videoRepository.findOne({relations: ['user'], where: {id}});
    if(!video) throw new NotFoundException('Not Found Video');
    return video;
  }

  async download(id: string): Promise<{ stream: ReadStream; mimetype: string; size: number }> {
    const video = await this.videoRepository.findOneBy({ id });
    if (!video) throw new NotFoundException('No video');

    await this.videoRepository.update({ id }, { downloadCnt: () => 'download_cnt + 1' });

    const { mimetype } = video;
    const extension = mimetype.split('/')[1];
    const videoPath = join(process.cwd(), 'video-storage', `${id}.${extension}`);
    const { size } = await stat(videoPath);
    const stream = createReadStream(videoPath);
    return { stream, mimetype, size };
  }

  async findTop5Download() {
    const videos = await this.videoRepository.find({
      relations: ['user'],
      order: {
        downloadCnt: 'DESC'
      },
      take: 5,
    });
    
    return videos;
  }
}
