import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import {
  ConversationHandler,
  FriendHandler,
  FriendRequestHandler,
  MessageHandler,
} from './handlers';

@Module({
  providers: [
    EventsGateway,
    ConversationHandler,
    MessageHandler,
    FriendHandler,
    FriendRequestHandler,
  ],
})
export class EventsModule {}
