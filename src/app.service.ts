import { Body, Injectable, Req, Res } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      message: 'Hello World!',
    };
  }

  healthCheck(): object {
    return {
      message: 'up',
    };
  }
}
