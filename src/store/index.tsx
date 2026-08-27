import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import {
  codeTypeManagementSlice,
  codeTypeSlice,
  khachHangSlice,
  lichSuChamSocSlice,
  navigationSlice,
  objMapUserSlice,
  parameterSlice,
  publicityLevelSlice,
  roleSlice,
  typesCodeTypeManagementSlice,
  userSlice,
  khoSlice,
  notificationSlice,
  productConfigurationSlice,
} from './';
import { Action } from './action';
import { globalSlice } from './global';
import { Slice, State } from './slice';
import { sanPhamSlice } from './san-pham';
import { laiXeSlice } from './quan-ly-lai-xe';
import { phuongTienSlice } from './quan-ly-phuong-tien';
import { chiPhiVanChuyenSlice } from './chi-phi-van-chuyen';
import { donHangSlice } from './don-hang';
import { lichSuChinhSuaSlice } from './lich-su-chinh-sua';
import { addressSlice } from './address';
import { rightMapRoleSlice } from './right-map-role';
import { warehouseTransactionSlice } from './xuat-nhap-ton';
import { dashboardSlice } from './dashboard';

const setupStore = () => {
  return configureStore({
    reducer: rootReducer,
  });
};
const useAppDispatch = () => useDispatch<ReturnType<typeof setupStore>['dispatch']>();
const useTypedSelector: TypedUseSelectorHook<ReturnType<typeof rootReducer>> = useSelector;
export { Action, setupStore, Slice, useAppDispatch, useTypedSelector };
export type { State };

export * from './code';
export * from './code/type';
export * from './codetype';
export * from './global';
export * from './khach-hang';
export * from './lich-su-cham-soc';
export * from './navigation';
export * from './obj-map-user';
export * from './parameter';
export * from './publicity-level';
export * from './user';
export * from './user/role';
export * from './san-pham';
export * from './kho';
export * from './quan-ly-lai-xe';
export * from './quan-ly-phuong-tien';
export * from './chi-phi-van-chuyen';
export * from './product-configuration';
export * from './right-map-role';
export * from './xuat-nhap-ton';
export * from './notification';
export * from './dashboard';
export * from './don-hang';

const rootReducer = combineReducers({
  [globalSlice.name]: globalSlice.reducer,
  [userSlice.name]: userSlice.reducer,
  [roleSlice.name]: roleSlice.reducer,
  [codeTypeManagementSlice.name]: codeTypeManagementSlice.reducer,
  [typesCodeTypeManagementSlice.name]: typesCodeTypeManagementSlice.reducer,
  [parameterSlice.name]: parameterSlice.reducer,
  [navigationSlice.name]: navigationSlice.reducer,
  [objMapUserSlice.name]: objMapUserSlice.reducer,
  [codeTypeSlice.name]: codeTypeSlice.reducer,
  [publicityLevelSlice.name]: publicityLevelSlice.reducer,
  [khachHangSlice.name]: khachHangSlice.reducer,
  [lichSuChamSocSlice.name]: lichSuChamSocSlice.reducer,
  [sanPhamSlice.name]: sanPhamSlice.reducer,
  [laiXeSlice.name]: laiXeSlice.reducer,
  [phuongTienSlice.name]: phuongTienSlice.reducer,
  [khoSlice.name]: khoSlice.reducer,
  [chiPhiVanChuyenSlice.name]: chiPhiVanChuyenSlice.reducer,
  [donHangSlice.name]: donHangSlice.reducer,
  [lichSuChinhSuaSlice.name]: lichSuChinhSuaSlice.reducer,
  [addressSlice.name]: addressSlice.reducer,
  [rightMapRoleSlice.name]: rightMapRoleSlice.reducer,
  [warehouseTransactionSlice.name]: warehouseTransactionSlice.reducer,
  [notificationSlice.name]: notificationSlice.reducer,
  [productConfigurationSlice.name]: productConfigurationSlice.reducer,
  [dashboardSlice.name]: dashboardSlice.reducer,
});
