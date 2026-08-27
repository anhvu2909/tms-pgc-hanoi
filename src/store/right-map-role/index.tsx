import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { CommonEntity, EStatusState, QueryParams } from '@models';
import { API, routerLinks } from '@utils';
import { customMessage } from 'src';

const name = 'RightMapRole';

// ĐÃ BỎ PHÂN QUYỀN THEO ACTION (isCreateAllowed/isUpdateAllowed/isDeleteAllowed...) — theo
// quyết định dùng baseline đơn giản "đăng nhập được là full quyền" (xem skill
// tu-dien-nghiep-vu-tms mục 8, phần RLS). Toàn bộ trang trong app đọc quyền qua
// RightMapRoleFacade().rightData/.rightDatas — sửa đúng 2 hàm dưới đây để luôn trả về
// full quyền là đủ, không cần sửa từng trang (kho, đơn hàng, khách hàng, sản phẩm...).
const FULL_RIGHT: RightMapRole = {
  groupName: '',
  groupCode: '',
  isViewAllowed: true,
  isViewAllAllowed: true,
  isCreateAllowed: true,
  isUpdateAllowed: true,
  isDeleteAllowed: true,
  isSendApprovalAllowed: true,
  isApproveAllowed: true,
  isAssignDeliveryAllowed: true,
  isCancelAllowed: true,
  isConfirmDeliveryAllowed: true,
  isUpdateDNAllowed: true,
  isCompleteWithoutDNAllowed: true,
  isUndoAllowed: true,
} as RightMapRole;

const action = {
  ...new Action<RightMapRole, EStatusRightMapRole>(name),
  getConfig: createAsyncThunk(name + 'getConfig', async ({ roleId }: { roleId: string }) => {
    return await API.get(`${routerLinks(name, 'api')}/config/${roleId}`);
  }),
  putConfig: createAsyncThunk(
    name + 'putConfig',
    async ({ roleId, rights }: { roleId: string; rights: RightMapRole[] }) => {
      const res = await API.put(`${routerLinks(name, 'api')}/config/${roleId}`, rights);
      if (res.message) customMessage.success({ type: 'success', content: res.message });
      return res;
    },
  ),
  getRightMapByCode: createAsyncThunk(name + 'getRightMapByCode', async ({ groupCode }: { groupCode: string }) => {
    return { isSuccess: true, message: '', data: { ...FULL_RIGHT, groupCode } };
  }),
  getRightMapByListCode: createAsyncThunk(
    name + 'getRightMapByListCode',
    async ({ groupCode }: { groupCode: string }) => {
      const codes = groupCode.split(',');
      return { isSuccess: true, message: '', data: codes.map((code) => ({ ...FULL_RIGHT, groupCode: code })) };
    },
  ),
};

export const rightMapRoleSlice = createSlice(
  new Slice<RightMapRole, EStatusRightMapRole>(action, {}, (builder) => {
    builder
      .addCase(action.getConfig.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusRightMapRole.getConfigPending;
      })
      .addCase(action.getConfig.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusRightMapRole.getConfigFulfilled;
          state.configList = action.payload.data;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getConfig.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusRightMapRole.getConfigRejected;
      })
      .addCase(action.putConfig.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusRightMapRole.putConfigPending;
      })
      .addCase(action.putConfig.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusRightMapRole.putConfigFulfilled;
          state.configList = action.payload.data;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.putConfig.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusRightMapRole.putConfigRejected;
      })
      .addCase(action.getRightMapByCode.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusRightMapRole.getRightMapByCodePending;
      })
      .addCase(action.getRightMapByCode.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusRightMapRole.getRightMapByCodeFulfilled;
          state.rightData = action.payload.data;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getRightMapByCode.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusRightMapRole.getRightMapByCodeRejected;
      })
      .addCase(action.getRightMapByListCode.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusRightMapRole.getRightMapByListCodePending;
      })
      .addCase(action.getRightMapByListCode.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusRightMapRole.getRightMapByCodeFulfilled;
          state.rightDatas = action.payload.data;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getRightMapByListCode.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusRightMapRole.getRightMapByListCodeRejected;
      });
  }),
);

export const RightMapRoleFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateRightMapRole<RightMapRole>),
    set: (values: StateRightMapRole<RightMapRole>) => dispatch(action.set(values)),
    get: (params: any) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateRightMapRole<RightMapRole> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: RightMapRole) => dispatch(action.post({ values })),
    put: (values: RightMapRole) => dispatch(action.put({ values })),
    delete: (id: string) => dispatch(action.delete({ id })),
    getConfig: (roleId: string) => dispatch(action.getConfig({ roleId })),
    putConfig: (roleId: string, rights: RightMapRole[]) => dispatch(action.putConfig({ roleId, rights })),
    getRightMapByCode: (groupCode: string) => dispatch(action.getRightMapByCode({ groupCode })),
    getRightMapByListCode: (groupCode: string) => dispatch(action.getRightMapByListCode({ groupCode })),
  };
};

interface StateRightMapRole<T> extends State<T, EStatusRightMapRole> {
  configList?: RightMapRole[];
  rightData?: RightMapRole;
  rightDatas?: RightMapRole[];
}

export class RightMapRole extends CommonEntity {
  constructor(
    public groupName?: string,
    public groupCode?: string,
    public isViewAllowed?: boolean,
    public isViewAllAllowed?: boolean,
    public isCreateAllowed?: boolean,
    public isUpdateAllowed?: boolean,
    public isDeleteAllowed?: boolean,
    public isSendApprovalAllowed?: boolean,
    public isApproveAllowed?: boolean,
    public isAssignDeliveryAllowed?: boolean,
    public isCancelAllowed?: boolean,
    public isConfirmDeliveryAllowed?: boolean,
    public isUpdateDNAllowed?: boolean,
    public isCompleteWithoutDNAllowed?: boolean,
    public isUndoAllowed?: boolean,
    public roleId?: string,
  ) {
    super();
  }
}
export enum EStatusRightMapRole {
  getConfigPending = 'getConfigPending',
  getConfigFulfilled = 'getConfigFulfilled',
  getConfigRejected = 'getConfigRejected',
  putConfigPending = 'putConfigPending',
  putConfigFulfilled = 'putConfigFulfilled',
  putConfigRejected = 'putConfigRejected',
  getRightMapByCodePending = 'getRightMapByCodePending',
  getRightMapByCodeFulfilled = 'getRightMapByCodeFulfilled',
  getRightMapByCodeRejected = 'getRightMapByCodeRejected',
  getRightMapByListCodePending = 'getRightMapByListCodePending',
  getRightMapByListCodeFulfilled = 'getRightMapByListCodeFulfilled',
  getRightMapByListCodeRejected = 'getRightMapByListCodeRejected',
}