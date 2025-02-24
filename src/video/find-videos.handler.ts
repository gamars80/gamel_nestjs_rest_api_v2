import { Injectable, Query } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";

import { Video } from "./entity/video.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { FindVideosQuery } from "./query/find-videos.query";


@Injectable()
@QueryHandler(FindVideosQuery)
export class FindVideosQueryHandler implements IQueryHandler<FindVideosQuery> {
    constructor(@InjectRepository(Video) private videoRepository: Repository<Video>) {}

    async execute({page, size}: FindVideosQuery): Promise<any> {
        const videos = await this.videoRepository.find({ relations: ['user'], skip: (page - 1) * size, take: size});
        return videos;
    }
}