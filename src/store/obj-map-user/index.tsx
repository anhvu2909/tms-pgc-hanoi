import { PayloadAction, createAsyncThunk, createSlice, Draft } from '@reduxjs/toolkit';
import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { Pagination, QueryParams } from '@models';
import { API } from '@utils';
import { Message } from '@core/message';

const name = 'ObjMapUser';
const action = {
  ...new Action<ObjMapUser, EStatusObjMapUser>(name),
  shareUser: createAsyncThunk(name + 'shareUser', async ({ id, data }: { id: string; data: ObjMapUser }) => {
    const res = await API.post(`/obj-map/user/${id}`, data);
    if (res.message) await Message.success({ text: res.message });
    return res;
  }),
};
export const objMapUserSlice = createSlice(
  new Slice<ObjMapUser, EStatusObjMapUser>(action, { keepUnusedDataFor: 9999 }, (builder) => {
    builder
      .addCase(action.shareUser.pending, (state, action) => {
        state.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        state.queryParams = JSON.stringify(action.meta.arg);
        state.isLoading = true;
        state.status = EStatusObjMapUser.shareUserPending;
      })
      .addCase(action.shareUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.data = action.payload as Draft<ObjMapUser>;
          state.status = EStatusObjMapUser.shareUserFulfilled;
        } else state.status = EStatusObjMapUser.idle;
        state.isLoading = false;
      })
      .addCase(action.shareUser.rejected, (state: StateObjMapUser<ObjMapUser>) => {
        state.status = EStatusObjMapUser.shareUserRejected;
        state.isLoading = false;
      });
  }),
);

export const ObjMapUserFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...(useTypedSelector((state) => state[action.name]) as StateObjMapUser<ObjMapUser>),
    set: (values: StateObjMapUser<ObjMapUser>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateObjMapUser<ObjMapUser> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: ObjMapUser) => dispatch(action.post({ values })),
    put: (values: ObjMapUser) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    shareUser: ({ id, data }: { id: string; data: ObjMapUser }) => dispatch(action.shareUser({ id, data })),
  };
};
interface StateObjMapUser<T> extends State<T, EStatusObjMapUser> {}
export class ObjMapUser {
  constructor(
    public id: string,
    public type?: string,
    public userId?: string,
    public isEditAllowed?: boolean,
    public isDownloadAllowed?: boolean,
    public isDeleteAllowed?: boolean,
    public isRecursive?: boolean,
  ) {}
}
export enum EStatusObjMapUser {
  idle = 'idle',
  shareUserPending = 'shareUserPending',
  shareUserFulfilled = 'shareUserFulfilled',
  shareUserRejected = 'shareUserRejected',
}
