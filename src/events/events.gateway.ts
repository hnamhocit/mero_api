import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ISocket } from 'src/common/interfaces';
import { Server } from 'socket.io'; // Import Server
import {
  ConversationHandler,
  FriendHandler,
  FriendRequestHandler,
  MessageHandler,
} from './handlers';

interface EventPayload {
  cmd: string;
  args?: any;
}

export const connectedUsers = new Map<number, ISocket>();

@WebSocketGateway({
  cors: { origin: '*', credentials: true }, // Adjust origin
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly conversationHandler: ConversationHandler,
    private readonly messageHandler: MessageHandler,
    private readonly friendRequestHandler: FriendRequestHandler,
    private readonly friendHandler: FriendHandler,
  ) {}

  afterInit(server: Server) {
    console.log('Socket.IO Server Initialized - Injecting into services');
    this.messageHandler.io = server;
    this.friendRequestHandler.io = server;
    this.friendHandler.io = server;
  }

  handleConnection(client: ISocket, ...args: any[]) {
    if (!client.user) {
      console.log(
        `❌ Connection rejected: No user payload found on socket ${client.id}`,
      );
      client.disconnect(true);
      return;
    }

    console.log(
      `✅ Client connected: ${client.id}, User ID: ${client.user.sub}`,
    );
    connectedUsers.set(client.user.sub, client);
  }

  handleDisconnect(client: ISocket) {
    if (client.user) {
      console.log(
        `❌ Client disconnected: ${client.id}, User ID: ${client.user.sub}`,
      );
      connectedUsers.delete(client.user.sub);
    } else {
      console.log(`❌ Client disconnected: ${client.id} (No user payload)`);
    }
  }

  @SubscribeMessage('conversation')
  handleConversationEvents(
    @ConnectedSocket() client: ISocket,
    @MessageBody() body: EventPayload,
    @Ack() cb: (response: any) => void,
  ) {
    switch (body.cmd) {
      case 'create':
        return this.conversationHandler.create(client, body.args, cb);
      default:
        cb({ ok: false, message: `Unknown conversation command: ${body.cmd}` });
    }
  }

  @SubscribeMessage('friend')
  handleFriendEvents(
    @ConnectedSocket() client: ISocket,
    @MessageBody() body: EventPayload,
    @Ack() cb: (response: any) => void,
  ) {
    switch (body.cmd) {
      case 'unfriend':
        return this.friendHandler.unfriend(client, body.args, cb);
      default:
        cb({ ok: false, message: `Unknown friend command: ${body.cmd}` });
    }
  }

  @SubscribeMessage('friendRequest')
  handleFriendRequestEvents(
    @ConnectedSocket() client: ISocket,
    @MessageBody() body: EventPayload,
    @Ack() cb: (response: any) => void,
  ) {
    switch (body.cmd) {
      case 'create':
        return this.friendRequestHandler.create(client, body.args, cb);
      case 'accept':
        return this.friendRequestHandler.accept(client, body.args, cb);
      case 'reject':
        return this.friendRequestHandler.reject(client, body.args, cb);
      default:
        cb({
          ok: false,
          message: `Unknown friendRequest command: ${body.cmd}`,
        });
    }
  }

  @SubscribeMessage('message')
  handleMessageEvents(
    @ConnectedSocket() client: ISocket,
    @MessageBody() body: EventPayload,
    @Ack() cb: (response: any) => void,
  ) {
    switch (body.cmd) {
      case 'getConversationMessages':
        return this.messageHandler.getConversationMessages(
          client,
          body.args,
          cb,
        );
      case 'send':
        return this.messageHandler.send(client, body.args, cb);
      case 'delete':
        return this.messageHandler.delete(client, body.args, cb);
      case 'deleteForMe':
        return this.messageHandler.deleteForMe(client, body.args, cb);
      default:
        cb({ ok: false, message: `Unknown message command: ${body.cmd}` });
    }
  }
}
