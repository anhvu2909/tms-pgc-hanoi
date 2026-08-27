import { Action, DonHang, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { CommonEntity, EStatusState, QueryParams } from '@models';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API, routerLinks } from '@utils';

const name = 'Dashboard';
const action = {
  ...new Action<DashboardModel, EStatusDashboard>(name),
  getDashboardsWithNoFilter: createAsyncThunk(
    'DashboardsWithNoFilter',
    async () => await API.get<DashboardModel>(`${routerLinks(name, 'api')}/dashboards-with-no-filter`),
  ),
  getRevenueOverTime: createAsyncThunk(
    'RevenueOverTime',
    async (params: string) =>
      await API.get<DashboardModel>(`${routerLinks(name, 'api')}/revenue-over-time?kindOfDate=${params}`),
  ),
};
export const dashboardSlice = createSlice(
  new Slice<DashboardModel, EStatusDashboard>(action, {}, (builder) => {
    builder
      .addCase(action.getDashboardsWithNoFilter.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDashboard.dashboardsWithNoFilterPending;
      })
      .addCase(action.getDashboardsWithNoFilter.fulfilled, (state: StateDashboard<DashboardModel>, action) => {
        const { ...res } = action.payload;
        if (res.data) {
          state.orderWithStatus = res.data.orderWithStatus;
          state.revenueAndTotalToday = res.data.revenueAndTotalToday;
          state.overdueWithStatusDelivery = res.data.overdueWithStatusDelivery;
          state.topCustomersWithRevenue = res.data.topCustomersWithRevenue;
          state.bestSellingProducts = res.data.bestSellingProducts;
          state.ordersInTransitToday = res.data.ordersInTransitToday;
          state.noRenderData = res.data;
        }
        state.isLoading = false;

        if (res.isSuccess) state.status = EStatusDashboard.dashboardsWithNoFilterFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.getDashboardsWithNoFilter.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusDashboard.dashboardsWithNoFilterRejected;
      })

      .addCase(action.getRevenueOverTime.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusDashboard.revenueOverTimePending;
      })
      .addCase(action.getRevenueOverTime.fulfilled, (state: StateDashboard<DashboardModel>, action) => {
        const { ...res } = action.payload;
        if (res.data) {
          state.revenueOverTime = res.data.revenueOverTime;
          state.renderData = res.data;
        }
        state.isLoading = false;

        if (res.isSuccess) state.status = EStatusDashboard.revenueOverTimeFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.getRevenueOverTime.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusDashboard.revenueOverTimeRejected;
      });
  }),
);
export const DashboardFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateDashboard<DashboardModel>),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getDashboardsWithNoFilter: () => dispatch(action.getDashboardsWithNoFilter()),
    getRevenueOverTime: (params: string) => dispatch(action.getRevenueOverTime(params)),
  };
};

interface StateDashboard<T> extends State<T, EStatusDashboard> {
  isDisable?: boolean;
  isEdit?: boolean;
  orderWithStatus?: DashboardDataModel;
  revenueAndTotalToday?: DashboardDataModel;
  overdueWithStatusDelivery?: DashboardDataModel;
  topCustomersWithRevenue?: DashboardDataModel;
  bestSellingProducts?: DashboardDataModel;
  revenueOverTime?: DashboardDataModel;
  ordersInTransitToday?: DonHang[];
  noRenderData?: any;
  renderData?: any;
}

export class DashboardModel extends CommonEntity {
  constructor(
    public orderWithStatus?: DashboardDataModel,
    public revenueAndTotalToday?: DashboardDataModel,
    public overdueWithStatusDelivery?: DashboardDataModel,
    public topCustomersWithRevenue?: DashboardDataModel,
    public bestSellingProducts?: DashboardDataModel,
    public revenueOverTime?: DashboardDataModel,
    public ordersInTransitToday?: DonHang[],
  ) {
    super();
  }
}

interface DashboardDataModel {
  metaObjects: any;
  dataObjects: any;
}

export enum EStatusDashboard {
  dashboardsWithNoFilterPending = 'dashboardsWithNoFilterPending',
  dashboardsWithNoFilterFulfilled = 'dashboardsWithNoFilterFulfilled',
  dashboardsWithNoFilterRejected = 'dashboardsWithNoFilterRejected',
  revenueOverTimePending = 'revenueOverTimePending',
  revenueOverTimeFulfilled = 'revenueOverTimeFulfilled',
  revenueOverTimeRejected = 'revenueOverTimeRejected',
}
