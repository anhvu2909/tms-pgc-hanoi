export const routerLinks = (name: string, type?: string) => {
  const array: {
    [selector: string]: string;
  } = {
    Login: '/auth/login',
    ForgetPassword: '/forgot-password',
    VerifyForotPassword: '/verify-forgot-password',
    SetPassword: '/set-password',
    MyProfile: '/my-profile',
    Dashboard: '/dashboard',
    User: '/user',
    Setting: '/setting',
    Code: '/code-type',
    Parameter: '/parameters',
    Navigation: '/navigation',
    KhachHang: '/khach-hang',
    SanPham: '/san-pham',
    LaiXe: '/quan-ly-lai-xe',
    Xe: '/qly-xe',
    Kho: '/kho',
    ChiPhiVanChuyen: '/chi-phi-van-chuyen',
    ProductConfiguration: '/cau-hinh-sp',
    DonHang: '/don-hang',
    RightMapRole: '/phan-quyen',
    TonKho: '/ton-kho',
    BaoCaoXuatNhap: '/bao-cao-xuat-nhap'
  }; // 💬 generate link to here
  const apis: {
    [selector: string]: string;
  } = {
    Auth: '/authentication',
    TypesCodeTypeManagement: '/admin/code-type/types',
    CodeTypeManagement: '/admin/code-types',
    Role: '/idm/roles',
    User: '/idm/users',
    Parameter: '/parameters',
    Navigation: '/bsd/navigations',
    Bin: '/bin',
    Files: '/files',
    ObjMapUser: '/obj-map/user',
    KhachHang: '/khach-hang',
    LichSuChamSoc: '/lich-su-cham-soc',
    SanPham: '/san-pham',
    LaiXe: '/quan-ly-lai-xe',
    Xe: '/quan-ly-phuong-tien',
    Kho: '/kho',
    ChiPhiVanChuyen: '/chi-phi-van-chuyen',
    DonHang: '/don-hang',
    LichSuChinhSua: '/activity-history',
    ProductConfiguration: '/product-configuration',
    Province: '/tinh',
    District: '/huyen',
    Commune: '/phuong',
    RightMapRole: '/idm/right-map-role',
    WarehouseTransaction: '/warehouse-transaction',
    Notification: '/notification',
    TransactionReport: '/transaction-report',
    Dashboard: '/dashboard-visualize'
  }; // 💬 generate api to here
  switch (type) {
    case 'api':
      return apis[name];
    default:
      return array[name];
  }
};
