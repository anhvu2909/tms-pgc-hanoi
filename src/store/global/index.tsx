import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import enUS from 'antd/lib/locale/en_US';
import viVN from 'antd/lib/locale/vi_VN';
import dayjs from 'dayjs';
import i18n from 'i18next';
import { CommonEntity } from '@models';
import { useAppDispatch, useTypedSelector } from '@store';
import { API, keyRefreshToken, keyToken, keyUser, lang, routerLinks, supabase } from '@utils';
import { customMessage } from '../../index';

const name = 'Auth';
const action = {
  name,
  set: createAsyncThunk(name + '/set', async (values: State) => values),

  // ĐÃ ĐỔI SANG SUPABASE AUTH (không còn gọi API .NET cũ).
  // GIẢ ĐỊNH: supabase.auth.signOut() không cần token cũ, tự dùng session hiện tại.
  logout: createAsyncThunk(name + '/logout', async () => {
    await supabase.auth.signOut();
    return true;
  }),

  // ĐÃ ĐỔI SANG SUPABASE AUTH. Lấy user đang đăng nhập từ session, rồi đọc thêm
  // dữ liệu nghiệp vụ (Name, RoleListCode, ...) từ bảng idm_User — "Id" của dòng này
  // luôn trùng với auth.uid() nhờ trigger đồng bộ (xem sql/01_auth_foundation.sql).
  // GIẢ ĐỊNH cần xác nhận khi test: mapping tên cột idm_User -> field của class User
  // bên dưới có thể còn thiếu/thừa so với bản gốc — bổ sung dần khi làm các màn hình sau.
  profile: createAsyncThunk(name + '/profile', async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return {};

    const { data: userRow, error } = await supabase
      .from('idm_User')
      .select('*')
      .eq('Id', authData.user.id)
      .single();

    if (error || !userRow) return {};

    return {
      id: userRow.Id,
      userName: userRow.UserName,
      name: userRow.Name,
      email: userRow.Email,
      phoneNumber: userRow.PhoneNumber,
      isActive: userRow.IsActive,
      isLockedOut: userRow.IsLockedOut,
      isEmailVerified: userRow.IsEmailVerified,
      roleListCode: userRow.RoleListCode,
      createdOnDate: userRow.CreatedOnDate,
    } as User;
  }),

  putProfile: createAsyncThunk(name + '/putProfile', async (values: User) => {
    const result = await API.put<{ user: User; accessToken: string; refreshToken: string }>(
      `/idm/users/${values.id}`,
      values,
    );
    if (result?.isSuccess) {
      if (result?.message) customMessage.success({content: result.message });
      // localStorage.setItem(keyToken, data?.accessToken);
      // localStorage.setItem(keyRefreshToken, data?.refreshToken);
    }
    return result?.isSuccess;
  }),
  changePasswordProfile: createAsyncThunk(name + '/changePasswordProfile', async (values: User) => {
    const result = await API.put<{ user: User }>(`/idm/users/${values.id}/password`, values);
    if (result?.isSuccess && result?.message) customMessage.success({content: result.message });
    return result?.isSuccess;
  }),

  // ĐÃ ĐỔI SANG SUPABASE AUTH. Form đăng nhập gốc gửi field tên "username" (chữ thường,
  // xem pages/login/index.tsx) — nhận cả 2 cách viết cho chắc. Dùng làm địa chỉ email
  // đăng nhập của Supabase Auth (đúng vì rule validate cột này là EFormRuleType.email).
  login: createAsyncThunk(
    name + '/login',
    async (values: { password: string; userName?: string; username?: string }) => {
      const email = values.userName || values.username || '';
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: values.password });

      if (error) {
        customMessage.error({ content: error.message });
        throw error;
      }

      if (data.session) {
        localStorage.setItem(keyToken, data.session.access_token);
        localStorage.setItem(keyRefreshToken, data.session.refresh_token);
      }

      // Chỉ cần trả về 1 object không rỗng để trang login điều hướng sang dashboard —
      // dữ liệu user thật được nạp ngay sau đó bởi action "profile" (xem pages/login/index.tsx).
      return data.user ? { userId: data.user.id } : undefined;
    },
  ),

  forgottenPassword: createAsyncThunk(name + '/forgotten-password', async (values: { email: string }) => {
    const { message } = await API.post(`${routerLinks(name, 'api')}/forgotten-password`, values);
    if (message) customMessage.success({content: message });
    return true;
  }),
  otpConfirmation: createAsyncThunk(name + '/otp-confirmation', async (values: { email: string; otp: string }) => {
    const { message } = await API.post(`${routerLinks(name, 'api')}/otp-confirmation`, values);
    if (message) customMessage.success({content: message });
    return true;
  }),
  resetPassword: createAsyncThunk(name + '/reset-password', async (values: ResetPassword) => {
    const { message } = await API.post(`${routerLinks(name, 'api')}/reset-password`, values);
    if (message) customMessage.success({content: message });
    return true;
  }),
};
interface ResetPassword {
  password?: string;
  retypedPassword?: string;
  passwordOld?: string;
  email?: string;
  otp?: string;
}

export class User {
  constructor(
    public listRole?: {
      id?: string;
      code?: string;
      name?: string;
      isSystem?: boolean;
      level?: number;
    }[],
    public id?: string,
    public userName?: string,
    public name?: string,
    public phoneNumber?: string,
    public countryCode?: string,
    public gender?: string,
    public email?: string,
    public avatarUrl?: string,
    public bankAccountNo?: string,
    public bankName?: string,
    public bankUsername?: string,
    public birthdate?: string,
    public lastActivityDate?: string,
    public isLockedOut?: boolean,
    public isActive?: boolean,
    public activeDate?: string,
    public level?: number,
    public facebookUserId?: string,
    public googleUserId?: string,
    public emailVerifyToken?: string,
    public roleListCode?: string[],
    public profileType?: string,
    public createdOnDate?: string,
    public isEmailVerified?: boolean,
    public role?: string,
    public roleCode?: string,
    public unit?: string,
    public title?: string,
    public allowedActions?: string[],
    public driverId?: string,
    public driverName?: string,
  ) {}
}
export class Auth extends CommonEntity {
  constructor(
    public userId?: string,
    public userModel?: User,
    public tokenString?: string,
    public issuedAt?: string,
    public expiresAt?: string,
    public roleListCode?: string[],
    public appSettings?: {
      reloadOrderListAfterOrderActions: string[];
      reloadMenuAfterOrderActions: string[];
      productListStyle: string;
    },
  ) {
    super();
  }
}
const checkLanguage = (language: string) => {
  const formatDate = language === 'vn' ? 'DD-MM-YYYY' : 'DD-MM-YYYY';
  const locale = language === 'vn' ? viVN : enUS;
  dayjs.locale(language === 'vn' ? 'vi' : language);
  localStorage.setItem('i18nextLng', language);
  return { language: language, formatDate, locale };
};
export enum EStatusGlobal {
  idle = 'idle',
  logoutFulfilled = 'logout.fulfilled',
  profilePending = 'profile.pending',
  profileFulfilled = 'profile.fulfilled',
  profileRejected = 'profile.rejected',
  putProfilePending = 'putProfile.pending',
  putProfileFulfilled = 'putProfile.fulfilled',
  putProfileRejected = 'putProfile.rejected',
  changePasswordProfilePending = 'changePasswordProfilePending',
  changePasswordProfileFulfilled = 'changePasswordProfileFulfilled',
  changePasswordProfileRejected = 'changePasswordProfileRejected',
  loginPending = 'login.pending',
  loginFulfilled = 'login.fulfilled',
  loginRejected = 'login.rejected',
  forgottenPasswordPending = 'forgottenPassword.pending',
  forgottenPasswordFulfilled = 'forgottenPassword.fulfilled',
  forgottenPasswordRejected = 'forgottenPassword.rejected',
  otpConfirmationPending = 'otpConfirmation.pending',
  otpConfirmationFulfilled = 'otpConfirmation.fulfilled',
  otpConfirmationRejected = 'otpConfirmation.rejected',
  resetPasswordPending = 'resetPassword.pending',
  resetPasswordFulfilled = 'resetPassword.fulfilled',
  resetPasswordRejected = 'resetPassword.rejected',
}
const initialState: State = {
  data: JSON.parse(localStorage.getItem(keyUser) || '{}'),
  routeLanguage: undefined,
  user: JSON.parse(localStorage.getItem(keyUser) || '{}'),
  isLoading: false,
  isVisible: false,
  status: EStatusGlobal.idle,
  pathname: '',
  ...checkLanguage(lang),
};
export const globalSlice = createSlice({
  name: action.name,
  initialState,
  reducers: {
    setLanguage: (state: State, action: PayloadAction<string>) => {
      if (action.payload !== state.language) {
        const { language, formatDate, locale } = checkLanguage(action.payload);
        i18n.changeLanguage(language);
        state.formatDate = formatDate;
        state.locale = locale;
        if (state.routeLanguage) state.pathname = state.routeLanguage[language];
        else
          state.pathname = location.hash.substring(1).replace('/' + state.language + '/', '/' + action.payload + '/');
        state.language = language;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(action.set.fulfilled, (state, action: PayloadAction<State>) => {
        let key: keyof State;
        for (key in action.payload) {
          state[key] = action.payload[key];
        }
      })
      // .addCase(action.logout.pending, (state: State) => {
      //   state.isLoading = true;
      //   state.status = 'logout.pending';
      // })
      .addCase(action.logout.fulfilled, (state) => {
        state.user = {};
        state.data = {};
        localStorage.removeItem(keyUser);
        localStorage.removeItem(keyToken);
        localStorage.removeItem(keyRefreshToken);
        state.isLoading = false;
        state.status = EStatusGlobal.logoutFulfilled;
      })

      .addCase(action.profile.pending, (state: State) => {
        state.isLoading = true;
        state.status = EStatusGlobal.profilePending;
      })
      .addCase(action.profile.fulfilled, (state: State, action: PayloadAction<User>) => {
        if (action.payload) {
          state.user = action.payload;
          state.data = action.payload;
          localStorage.setItem(keyUser, JSON.stringify(action.payload));
          state.status = EStatusGlobal.profileFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.profile.rejected, (state: State) => {
        state.status = EStatusGlobal.profileRejected;
        state.isLoading = false;
      })

      .addCase(action.putProfile.pending, (state: State, action) => {
        state.data = { ...state.data, ...action.meta.arg };
        state.isLoading = true;
        state.status = EStatusGlobal.putProfilePending;
      })
      .addCase(action.putProfile.fulfilled, (state: State, action: PayloadAction<User> | any) => {
        if (action.payload) {
          //   localStorage.setItem(keyUser, JSON.stringify(action.payload));
          //   state.user = action.payload;
          state.status = EStatusGlobal.putProfileFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.putProfile.rejected, (state: State) => {
        state.status = EStatusGlobal.putProfileRejected;
        state.isLoading = false;
      })
      .addCase(action.changePasswordProfile.pending, (state: State, action) => {
        state.data = { ...state.data, ...action.meta.arg };
        state.isLoading = true;
        state.status = EStatusGlobal.changePasswordProfilePending;
      })
      .addCase(action.changePasswordProfile.fulfilled, (state: State, action: PayloadAction<User> | any) => {
        if (action.payload) {
          state.status = EStatusGlobal.changePasswordProfileFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.changePasswordProfile.rejected, (state: State) => {
        state.status = EStatusGlobal.changePasswordProfileRejected;
        state.isLoading = false;
      })
      .addCase(
        action.login.pending,
        (
          state: State,
          action: PayloadAction<
            undefined,
            string,
            { arg: { password?: string; email?: string }; requestId: string; requestStatus: 'pending' }
          >,
        ) => {
          state.data = action.meta.arg;
          state.isLoading = true;
          state.status = EStatusGlobal.loginPending;
        },
      )
      .addCase(action.login.fulfilled, (state: State, action: PayloadAction<Auth> | any) => {
        if (action.payload) {
          localStorage.setItem(keyUser, JSON.stringify(action.payload));
          state.user = action.payload;
          state.data = {};
          state.status = EStatusGlobal.loginFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.login.rejected, (state: State) => {
        state.status = EStatusGlobal.loginRejected;
        state.isLoading = false;
      })

      .addCase(
        action.forgottenPassword.pending,
        (
          state: State,
          action: PayloadAction<
            undefined,
            string,
            { arg: { email?: string }; requestId: string; requestStatus: 'pending' }
          >,
        ) => {
          state.data = action.meta.arg;
          state.isLoading = true;
          state.status = EStatusGlobal.forgottenPasswordPending;
        },
      )
      .addCase(action.forgottenPassword.fulfilled, (state: State, action: PayloadAction<boolean>) => {
        if (action.payload) {
          state.status = EStatusGlobal.forgottenPasswordFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.forgottenPassword.rejected, (state: State) => {
        state.status = EStatusGlobal.forgottenPasswordRejected;
        state.isLoading = false;
      })

      .addCase(
        action.otpConfirmation.pending,
        (
          state: State,
          action: PayloadAction<
            undefined,
            string,
            { arg: { email?: string; otp?: string }; requestId: string; requestStatus: 'pending' }
          >,
        ) => {
          state.data = action.meta.arg;
          state.isLoading = true;
          state.status = EStatusGlobal.otpConfirmationPending;
        },
      )
      .addCase(action.otpConfirmation.fulfilled, (state: State, action: PayloadAction<boolean>) => {
        if (action.payload) {
          state.status = EStatusGlobal.otpConfirmationFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.otpConfirmation.rejected, (state: State) => {
        state.status = EStatusGlobal.otpConfirmationRejected;
        state.isLoading = false;
      })

      .addCase(
        action.resetPassword.pending,
        (
          state: State,
          action: PayloadAction<undefined, string, { arg: ResetPassword; requestId: string; requestStatus: 'pending' }>,
        ) => {
          state.data = action.meta.arg;
          state.isLoading = true;
          state.status = EStatusGlobal.resetPasswordPending;
        },
      )
      .addCase(action.resetPassword.fulfilled, (state: State, action: PayloadAction<boolean>) => {
        if (action.payload) {
          state.data = {};
          state.status = EStatusGlobal.resetPasswordFulfilled;
        } else state.status = EStatusGlobal.idle;
        state.isLoading = false;
      })
      .addCase(action.resetPassword.rejected, (state: State) => {
        state.status = EStatusGlobal.resetPasswordRejected;
        state.isLoading = false;
      });
  },
});

interface State {
  [selector: string]: any;
  user?: Auth;
  data?: ResetPassword & Auth;
  routeLanguage?: Record<string, string>;
  isLoading?: boolean;
  isVisible?: boolean;
  status?: EStatusGlobal;
  pathname?: string;
  formatDate?: string;
  language?: string;
  locale?: typeof viVN | typeof enUS;
}
export const GlobalFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...(useTypedSelector((state) => state[action.name]) as State),
    set: (values: State) => dispatch(action.set(values)),
    logout: () => dispatch(action.logout()),
    profile: () => dispatch(action.profile()),
    putProfile: (values: Auth) => dispatch(action.putProfile(values)),
    changePasswordProfile: (values: any) => dispatch(action.changePasswordProfile(values)),
    login: (values: { password: string; userName: string }) => dispatch(action.login(values)),
    forgottenPassword: (values: { email: string }) => dispatch(action.forgottenPassword(values)),
    otpConfirmation: (values: { email: string; otp: string }) => dispatch(action.otpConfirmation(values)),
    resetPassword: (values: ResetPassword) => dispatch(action.resetPassword(values)),
    setLanguage: (value: string) => dispatch(globalSlice.actions.setLanguage(value)),
  };
};
