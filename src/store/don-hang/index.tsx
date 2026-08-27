import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { CommonEntity, EStatusState, QueryParams } from '@models';
import { Action, Slice, State, useAppDispatch, User, useTypedSelector } from '@store';
import { API, routerLinks, supabase } from '@utils';
import { customMessage } from 'src';
import * as XLSX from 'xlsx';
import { PhuongTienModel } from '../quan-ly-phuong-tien';
import { LaiXeModel } from '../quan-ly-lai-xe';

const name = 'DonHang';
const action = {
  ...new Action<DonHang, EStatusDonHang>(name),
  putStatus: createAsyncThunk(name + 'putStatus', async ({ values }: { values: DonHang }) => {
    const { data, message } = await API.put(`${routerLinks(name, 'api')}/status/${values.id}`, values);
    if (message) customMessage.success({ type: 'success', content: message });
    return data;
  }),
  approve: createAsyncThunk(name + 'approve', async ({ id }: { id: string }) => {
    const { data, message } = await API.put(`${routerLinks(name, 'api')}/approve/${id}`);
    if (message) customMessage.success({ type: 'success', content: message });
    return data;
  }),
  reject: createAsyncThunk(name + 'reject', async ({ values }: { values: DonHang }) => {
    const { data, message } = await API.put(`${routerLinks(name, 'api')}/reject/${values.id}`, values);
    if (message) customMessage.success({ type: 'success', content: message });
    return data;
  }),
  deleteMany: createAsyncThunk(name + '/many', async ({ model }: { model: string }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}/many`, { model });
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
  // Không còn backend .NET để xuất file, nên lấy dữ liệu qua đúng API.get('/don-hang')
  // (đã được api.ts định tuyến sang Supabase) rồi dựng file .xlsx ngay trên trình duyệt
  // bằng thư viện xlsx (SheetJS). GIẢ ĐỊNH: chỉ xuất các cột hiển thị trên danh sách,
  // không xuất chi tiết dòng sản phẩm — hỏi lại người dùng nếu cần thêm.
  exportExcelFile: createAsyncThunk(name + 'exportExcelFile', async (query: QueryParams) => {
    try {
      const res = await API.get<{ content: DonHang[] }>(routerLinks(name, 'api'), {
        page: query.page ?? 1,
        size: query.size ?? -1,
        filter: query.filter ?? '{}',
        sort: query.sort ?? '',
      });

      const rows = (res.data?.content ?? []).map((x) => ({
        'Mã đơn hàng': x.ma,
        'Trạng thái': x.trangThai,
        'Bên giao': x.benGiao,
        'Địa chỉ bên giao': x.diaChiBenGiao,
        'Bên nhận': x.benNhan,
        'Địa chỉ bên nhận': x.diaChiBenNhan,
        'Mức độ ưu tiên': x.mucDoUuTien,
        'Tổng khối lượng (kg)': x.tongTrongLuong,
        'Cước vận chuyển (đ/kg)': x.cuocVanChuyen,
        'Thành tiền (đ)': x.thanhTien,
        'Thời hạn giao hàng': x.thoiHanGiaoHang,
        'Ngày tạo': x.createdOnDate,
        'Người tạo': x.createdByUserName,
        'Ghi chú': x.ghiChu,
      }));

      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'DonHang');
      XLSX.writeFile(book, `Danh_sach_don_hang_${Date.now()}.xlsx`);

      customMessage.success({ content: 'Xuất file thành công' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xuất file';
      customMessage.error({ content: errorMessage });
    }
  }),
  cancel: createAsyncThunk(name + 'cancel', (data: { orderIdList: string[]; reason: string }) => {
    return API.put(`${routerLinks(name, 'api')}/cancel`, data);
  }),
  complete: createAsyncThunk(name + 'complete', (id: string) => {
    return API.put(`${routerLinks(name, 'api')}/${id}/complete`);
  }),
  countOrderByStatus: createAsyncThunk(name + 'countOrderByStatus', (params: QueryParams) => {
    return API.get<Record<string, number>>(`${routerLinks(name, 'api')}/count-by-status`, params);
  }),
  revertActivity: createAsyncThunk(
    name + 'revertActivity',
    ({ orderId, activityId }: { orderId: string; activityId: string }) => {
      return API.put<DonHang>(`${routerLinks(name, 'api')}/${orderId}/revert/${activityId}`);
    },
  ),
};

export const donHangSlice = createSlice(
  new Slice<DonHang, EStatusDonHang>(action, {}, (builder) => {
    builder
      .addCase(action.putStatus.pending, (state, action) => {
        state.isFormLoading = true;
        state.status = EStatusDonHang.putStatusPending;
        state.isLoading = true;
      })
      .addCase(action.putStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusDonHang.putStatusFulfilled;
        } else state.status = EStatusState.idle;
        state.isFormLoading = false;
        state.isLoading = false;
      })
      .addCase(action.putStatus.rejected, (state) => {
        state.status = EStatusDonHang.putStatusRejected;
        state.isFormLoading = false;
        state.isLoading = false;
      })
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDonHang.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusDonHang.deleteManyFulfilled;
        state.selectedRowKeys = undefined;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusDonHang.deleteManyRejected;
      })
      .addCase(action.approve.pending, (state, action) => {
        state.isFormLoading = true;
        state.status = EStatusDonHang.approvePending;
        state.isLoading = true;
      })
      .addCase(action.approve.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusDonHang.approveFulfilled;
        } else state.status = EStatusState.idle;
        state.isFormLoading = false;
        state.isLoading = false;
      })
      .addCase(action.approve.rejected, (state) => {
        state.status = EStatusDonHang.approveRejected;
        state.isFormLoading = false;
        state.isLoading = false;
      })
      .addCase(action.reject.pending, (state, action) => {
        state.isFormLoading = true;
        state.status = EStatusDonHang.rejectPending;
        state.isLoading = true;
      })
      .addCase(action.reject.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = EStatusDonHang.rejectFulfilled;
        } else state.status = EStatusState.idle;
        state.isFormLoading = false;
        state.isLoading = false;
      })
      .addCase(action.reject.rejected, (state) => {
        state.status = EStatusDonHang.rejectRejected;
        state.isFormLoading = false;
        state.isLoading = false;
      })
      .addCase(action.countOrderByStatus.pending, (state) => {
        state.status = EStatusDonHang.countOrderByStatusPending;
      })
      .addCase(action.countOrderByStatus.fulfilled, (state: StateDonHang<DonHang>, action) => {
        state.paginationByStatus = action.payload.data;
      })
      .addCase(action.countOrderByStatus.rejected, (state) => {
        state.status = EStatusDonHang.countOrderByStatusRejected;
      })
      .addCase(action.exportExcelFile.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDonHang.exportExcelFilePending;
      })
      .addCase(action.exportExcelFile.fulfilled, (state: StateDonHang<DonHang>) => {
        state.isLoading = false;
        state.status = EStatusDonHang.exportExcelFileFulfilled;
        state.isExportFileModal = false;
      })
      .addCase(action.exportExcelFile.rejected, (state: StateDonHang<DonHang>) => {
        state.isLoading = false;
        state.status = EStatusDonHang.exportExcelFileRejected;
        state.isExportFileModal = false;
      })
      .addCase(action.cancel.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDonHang.cancelPending;
      })
      .addCase(action.cancel.fulfilled, (state: StateDonHang<DonHang>, action) => {
        state.isLoading = false;
        state.status = EStatusDonHang.cancelFulfilled;
        state.cancelRowKeys = [];
        state.isCancelModalOpen = false;
        customMessage.success({ type: 'success', content: action.payload.message });
      })
      .addCase(action.cancel.rejected, (state: StateDonHang<DonHang>) => {
        state.isLoading = false;
        state.status = EStatusDonHang.cancelRejected;
      })
      .addCase(action.complete.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDonHang.completePending;
        state.isVisible = false;
      })
      .addCase(action.complete.fulfilled, (state: StateDonHang<DonHang>, action) => {
        state.isLoading = false;
        state.status = EStatusDonHang.completeFulfilled;
        customMessage.success({ type: 'success', content: action.payload.message });
      })
      .addCase(action.complete.rejected, (state: StateDonHang<DonHang>) => {
        state.isLoading = false;
        state.status = EStatusDonHang.completeRejected;
      })
      .addCase(action.revertActivity.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDonHang.revertActivityPending;
      })
      .addCase(action.revertActivity.fulfilled, (state: StateDonHang<DonHang>, action) => {
        if (state.data?.id === action.payload.data?.id) {
          state.data = action.payload.data;
        }

        state.isLoading = false;
        state.status = EStatusDonHang.revertActivityFulfilled;
        customMessage.success({ type: 'success', content: action.payload.message });
      })
      .addCase(action.revertActivity.rejected, (state: StateDonHang<DonHang>) => {
        state.isLoading = false;
        state.status = EStatusDonHang.revertActivityRejected;
      });
  }),
);

export const DonHangFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateDonHang<DonHang>),
    set: (values: StateDonHang<DonHang>) => dispatch(action.set(values)),
    get: (params: any) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateDonHang<DonHang> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: User) => dispatch(action.post({ values })),
    put: (values: User) => dispatch(action.put({ values })),
    delete: (id: string) => dispatch(action.delete({ id })),
    putStatus: (values: DonHang) => dispatch(action.putStatus({ values })),
    approve: (id: string) => dispatch(action.approve({ id })),
    reject: (values: DonHang) => dispatch(action.reject({ values })),
    deleteMany: (params: { model: string }) => dispatch(action.deleteMany(params)),
    exportExcelFile: (query: QueryParams) => dispatch(action.exportExcelFile(query)),
    countOrderByStatus: (params: QueryParams) => dispatch(action.countOrderByStatus(params)),
    cancel: (orderIdList: string[], reason: string) => dispatch(action.cancel({ orderIdList, reason })),
    complete: (id: string) => dispatch(action.complete(id)),
    revertActivity: (orderId: string, activityId: string) => dispatch(action.revertActivity({ orderId, activityId })),
  };
};

interface StateDonHang<T> extends State<T, EStatusDonHang> {
  selectedRowKeys?: string[];
  cancelRowKeys?: string[];
  deleteRowKeys?: string[];
  isEdit?: boolean;
  isModalVisible?: boolean;
  quyDoi?: number;
  isExportFileModal?: boolean;
  isCancelModalOpen?: boolean;
  paginationByStatus?: Record<string, number>;
}

export class DonHang extends CommonEntity {
  constructor(
    public id?: string,
    public ma?: string,
    public trangThai?: string,
    public benGiaoId?: string,
    public benNhanId?: string,
    public diaChiBenNhanId?: string,
    public benGiao?: string,
    public diaChiBenGiao?: string,
    public benNhan?: string,
    public diaChiBenNhan?: string,
    public mucDoUuTien?: string,
    public ghiChu?: string,
    public cuocVanChuyen?: number,
    public tongTrongLuong?: number,
    public thanhTien?: number,
    public allowedActions?: string[],
    public lyDoTuChoi?: string,
    public thoiHanGiaoHang?: string,
    public ngayDatHang?: string,
    public createdByUserFullName?: string,
    public phuongTien?: PhuongTienModel,
    public laiXe?: LaiXeModel,
    public laiXeId?: string,
    public phuongTienId?: string,
    public sanPham?: {
      id?: string;
      sanPhamId?: string;
      maSanPham?: string;
      tenSanPham?: string;
      soLuong?: number;
      donGia?: number;
      trongLuong?: number;
      quyDoi?: number;
    }[],
  ) {
    super();
  }
}

export type T_DonHangFilterFields = {
  fullTextSearch?: string;
  TrangThai?: string;
  CreatedByUserId?: string;
  MucDoUuTien?: string;
  KhoGiao?: string;
  KhoNhan?: string;
};

export enum EStatusDonHang {
  putStatusPending = 'putStatusPending',
  putStatusFulfilled = 'putStatusFulfilled',
  putStatusRejected = 'putStatusRejected',
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
  approvePending = 'approvePending',
  approveFulfilled = 'approveFulfilled',
  approveRejected = 'approveRejected',
  rejectPending = 'rejectPending',
  rejectFulfilled = 'rejectFulfilled',
  rejectRejected = 'rejectRejected',
  exportExcelFilePending = 'exportExcelFilePending',
  exportExcelFileFulfilled = 'exportExcelFileFulfilled',
  exportExcelFileRejected = 'exportExcelFileRejected',
  cancelPending = 'cancelPending',
  cancelFulfilled = 'cancelFulfilled',
  cancelRejected = 'cancelRejected',
  countOrderByStatusPending = 'countOrderByStatusPending',
  countOrderByStatusFulfilled = 'countOrderByStatusFulfilled',
  countOrderByStatusRejected = 'countOrderByStatusRejected',
  completePending = 'completePending',
  completeFulfilled = 'completeFulfilled',
  completeRejected = 'completeRejected',
  revertActivityPending = 'revertActivityPending',
  revertActivityFulfilled = 'revertActivityFulfilled',
  revertActivityRejected = 'revertActivityRejected',
}
