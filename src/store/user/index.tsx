import { createAsyncThunk, createSlice, Draft, PayloadAction } from '@reduxjs/toolkit';

import { Message } from '@core/message';
import { QueryParams } from '@models';
import { Action, Slice, State, useAppDispatch, User, useTypedSelector } from '@store';
import { API } from '@utils';
import { customMessage } from 'src';

const name = 'User';
export const action = {
  ...new Action<User, EStatusUser>(name),
  lock: createAsyncThunk(name + 'lock', async (id: string) => {
    const { data, message } = await API.put(`/idm/users/${id}/lock`);
    if (message) customMessage.success({ type: 'success', content: message });
    return data;
  }),
  unlock: createAsyncThunk(name + 'unlock', async (id: string) => {
    const { data, message } = await API.put(`/idm/users/${id}/unlock`);
    if (message) customMessage.success({ type: 'success', content: message });
    return data;
  }),
  changePassword: createAsyncThunk(
    name + 'changePassword',
    async ({ id, password }: { id: string; password: string }) => {
      const { data, message } = await API.put(`/idm/users/${id}/password`, { password });
      if (message) customMessage.success({ type: 'success', content: message });
      return data;
    },
  ),
  putAvatar: createAsyncThunk(name + 'putAvatar', async ({ id, avatarUrl }: { id: string; avatarUrl: string }) => {
    const { data, message } = await API.put(`/me/info/avatar`, { avatarUrl, userId: id });
    if (message) customMessage.success({ type: 'success', content: message });
    return data;
  }),
};
export const userSlice = createSlice(
  new Slice<User, EStatusUser>(action, { keepUnusedDataFor: 9999 }, (builder) => {
    builder
      .addCase(action.lock.pending, (state, action) => {
        state.data = action.meta.arg as Draft<User>;
        state.isSwitchLoading = true;
        state.status = EStatusUser.lockPending;
      })
      .addCase(action.lock.fulfilled, (state, action) => {
        state.status = EStatusUser.lockFulfilled;
        state.isSwitchLoading = false;
      })
      .addCase(action.lock.rejected, (state) => {
        state.status = EStatusUser.lockRejected;
        state.isSwitchLoading = false;
      })
      .addCase(action.unlock.pending, (state, action) => {
        state.data = action.meta.arg as Draft<User>;
        state.isSwitchLoading = true;
        state.status = EStatusUser.unlockPending;
      })
      .addCase(action.unlock.fulfilled, (state, action) => {
        state.status = EStatusUser.unlockFulfilled;
        state.isSwitchLoading = false;
      })
      .addCase(action.unlock.rejected, (state) => {
        state.status = EStatusUser.unlockRejected;
        state.isSwitchLoading = false;
      })

      .addCase(
        action.changePassword.pending,
        (
          state: StateUser<User>,
          action: PayloadAction<undefined, string, { arg: User; requestId: string; requestStatus: 'pending' }>,
        ) => {
          state.data = action.meta.arg;
          state.status = EStatusUser.changePasswordPending;
        },
      )
      .addCase(action.changePassword.fulfilled, (state: StateUser<User>) => {
        state.data = undefined;
        state.isVisibleChangePass = false;
        state.status = EStatusUser.changePasswordFulfilled;
      })
      .addCase(action.changePassword.rejected, (state: StateUser<User>) => {
        state.status = EStatusUser.changePasswordRejected;
      })
      .addCase(action.putAvatar.pending, (state, action) => {
        state.data = action.meta.arg as Draft<User>;
        state.isLoading = true;
        state.status = EStatusUser.putAvatarPending;
      })
      .addCase(action.putAvatar.fulfilled, (state, action) => {
        if (action.payload) {
          if (JSON.stringify(state.data) !== JSON.stringify(action.payload)) state.data = action.payload;
          state.isVisible = false;
          state.status = EStatusUser.putAvatarFulfilled;
        } else state.status = EStatusUser.idle;
        state.isLoading = false;
      })
      .addCase(action.putAvatar.rejected, (state) => {
        state.status = EStatusUser.putAvatarRejected;
        state.isLoading = false;
      });
  }),
);

export const UserFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateUser<User>),
    set: (values: StateUser<User>) => dispatch(action.set(values)),
    get: (params: any) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateUser<User> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: User) => dispatch(action.post({ values })),
    put: (values: User) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    lock: (id: string) => dispatch(action.lock(id)),
    unlock: (id: string) => dispatch(action.unlock(id)),
    changePassword: (id: string, password: string) => dispatch(action.changePassword({ id, password })),
    putAvatar: (id: string, avatarUrl: string) => dispatch(action.putAvatar({ id, avatarUrl })),
  };
};
interface StateUser<T> extends State<T, EStatusUser> {
  isSwitchLoading?: boolean;
  isModalVisible?: boolean;
  isVisibleChangePass?: boolean;
  selectedRowKeys?: string[];
}
export enum EStatusUser {
  idle = 'idle',
  lockPending = 'lockPending',
  lockFulfilled = 'lockFulfilled',
  lockRejected = 'lockRejected',
  unlockPending = 'unlockPending',
  unlockFulfilled = 'unlockFulfilled',
  unlockRejected = 'unlockRejected',
  changePasswordPending = 'changePasswordPending',
  changePasswordFulfilled = 'changePasswordFulfilled',
  changePasswordRejected = 'changePasswordRejected',
  putAvatarPending = 'putAvatarPending',
  putAvatarFulfilled = 'putAvatarFulfilled',
  putAvatarRejected = 'putAvatarRejected',
}
