import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string } {
    return {
      message: 'Hello World!',
    };
  }

  healthCheck(): { message: string } {
    return {
      message: 'up',
    };
  }
}
