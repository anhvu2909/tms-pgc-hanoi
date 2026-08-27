import { QueryParams } from '@models';
import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Action, setupStore, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { API, notificationChannel, routerLinks } from '@utils';
import { initializeApp } from 'firebase/app';
import { getMessaging, deleteToken, getToken, onMessage } from 'firebase/messaging';
import { customMessage } from 'src';

const config = {
  apiKey: 'AIzaSyBYXi1mu0DM_U5xIAABmeFKf-QrIj5BDgI',
  authDomain: 'petro-notif.firebaseapp.com',
  projectId: 'petro-notif',
  storageBucket: 'petro-notif.firebasestorage.app',
  messagingSenderId: '869274208587',
  appId: '1:869274208587:web:a693a1de298fae037980ce',
  measurementId: 'G-XLCFS0YQET',
};
const app = initializeApp(config);
const messaging = getMessaging(app);
const channel = new BroadcastChannel(notificationChannel);
const receivePushNotification = createAction<NotificationModel>('receivePushNotification');

export function setupMessaging(store: ReturnType<typeof setupStore>) {
  channel.addEventListener('message', (event) => {
    store.dispatch(receivePushNotification(event.data));
  });
  onMessage(messaging, (msg) => {
    store.dispatch(receivePushNotification(JSON.parse(msg.data?.data ?? '{}')));
  });
}

export enum EStatusNotification {
  countUnreadPending = 'countUnreadPending',
  countUnreadFulfilled = 'countUnreadFulfilled',
  countUnreadRejected = 'countUnreadRejected',
  deleteAllPending = 'deleteAllPending',
  deleteAllFulfilled = 'deleteAllFulfilled',
  deleteAllRejected = 'deleteAllRejected',
}

interface NotificationState<T> extends State<T, EStatusNotification> {
  list?: NotificationModel[];
  unreadCount?: number;
  isViewPrev?: boolean;
  isPrevAvailable?: boolean;
}

export class NotificationModel {
  constructor(
    public id: string,
    public type: string,
    public title: string,
    public partedTitle: string[],
    public body: string | null | undefined,
    public imageUrl: string,
    public isRead: boolean,
    public receiverId: string,
    public orderId: string,
    public activityHistoryId: string | null | undefined,
    public lastModifiedOnDate: string,
    public createdOnDate: string,
  ) {}
}

const name = 'Notification';
const action = {
  ...new Action<NotificationModel, EStatusNotification>(name),
  revokeFCM: createAsyncThunk(name + 'revokeFCM', async () => {
    await deleteToken(messaging);
  }),
  requestNotification: createAsyncThunk(name + 'requestNotification', async () => {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: 'BPQ7SClaXqi6Z4qU6PwU7wRxlYYpMyj2FNar0UnoWjOvVrXcXTYCUOKaLuYU5ZuCRZbP3afw3d9Z3CfROnxUWYw',
    });

    return await API.post(`${routerLinks(name, 'api')}/submit-notification`, { token });
  }),
  countUnread: createAsyncThunk(name + 'countUnread', () =>
    API.get<number>(`${routerLinks(name, 'api')}/count-unread`),
  ),
  markAsRead: createAsyncThunk(name + 'markAsRead', (idList: any[]) =>
    API.put<number[]>(`${routerLinks(name, 'api')}/mark-as-read`, {
      notificationIdList: idList,
    }),
  ),
  deleteAll: createAsyncThunk(name + 'deleteAll', () => API.delete<number>(`${routerLinks(name, 'api')}`)),
};

export const notificationSlice = createSlice({
  ...new Slice<NotificationModel, EStatusNotification>(action, {}, (builder) => {
    builder.addCase(action.countUnread.pending, (state) => {
      state.status = EStatusNotification.countUnreadPending;
    });
    builder.addCase(action.countUnread.fulfilled, (state: NotificationState<NotificationModel>, action) => {
      state.unreadCount = action.payload.data ?? 0;
      state.status = EStatusNotification.countUnreadFulfilled;
    });
    builder.addCase(action.countUnread.rejected, (state) => {
      state.status = EStatusNotification.countUnreadRejected;
    });
    builder.addCase(action.markAsRead.fulfilled, (state: NotificationState<NotificationModel>, action) => {
      state.list?.filter((x) => action.payload.data?.includes(Number(x.id))).forEach((x) => (x.isRead = true));
      state.unreadCount = Math.max(0, (state.unreadCount ?? 0) - (action.payload.data?.length ?? 0));
    });
    builder.addCase(receivePushNotification, (state: NotificationState<NotificationModel>, action) => {
      state.list = [action.payload, ...(state.list ?? [])];
      state.unreadCount = (state.unreadCount ?? 0) + 1;
    });
    builder.addCase(action.deleteAll.pending, (state) => {
      state.isLoading = true;
      state.status = EStatusNotification.deleteAllPending;
    });
    builder.addCase(action.deleteAll.fulfilled, (state: NotificationState<NotificationModel>, action) => {
      state.list = [];
      state.isPrevAvailable = false;
      state.unreadCount = 0;
      state.isLoading = false;
      state.status = EStatusNotification.deleteAllFulfilled;
      customMessage.success({ type: 'success', content: `Đã xoá ${action.payload.data} thông báo` });
    });
    builder.addCase(action.deleteAll.rejected, (state) => {
      state.isLoading = false;
      state.status = EStatusNotification.deleteAllRejected;
    });
  }),
});

export const NotificationFacade = () => {
  const dispatch = useAppDispatch();

  return {
    ...useTypedSelector((state) => state[action.name] as NotificationState<NotificationModel>),
    set: (values: NotificationState<NotificationModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    revokeFCM: () => dispatch(action.revokeFCM()),
    requestNotification: () => dispatch(action.requestNotification()),
    countUnread: () => dispatch(action.countUnread()),
    markAsRead: (idList: any[]) => dispatch(action.markAsRead(idList)),
    deleteAll: () => dispatch(action.deleteAll()),
  };
};
