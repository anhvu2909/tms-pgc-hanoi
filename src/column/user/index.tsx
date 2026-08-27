import { ToolTip } from '@core/tooltip';
import { DataTableModel, EFormRuleType, EFormType, ETableAlign, FormModel } from '@models';
import { Check, Disable, Edit, Key, Trash } from '@svgs';
import { Avatar, Popconfirm, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { GlobalFacade, UserFacade } from '@store';
import { useTranslation } from 'react-i18next';

export default {
  table: (): DataTableModel[] => {
    const { formatDate } = GlobalFacade();
    const { t } = useTranslation();
    const userFacade = UserFacade();

    return [
      {
        title: `routes.admin.user.Full name`,
        name: 'name',
        tableItem: {
          width: 300,
          fixed: window.innerWidth > 767 ? 'left' : '',
          render: (text: string, item: any) => {
            return (
              <div className={'flex items-center gap-x-2'}>
                <Avatar src={item.avatarUrl} />
                <p>{item.name}</p>
              </div>
            );
          },
        },
      },
      // {
      //   title: 'routes.admin.user.Role',
      //   name: 'role',
      //   tableItem: {
      //     width: 120,
      //     sorter: true,
      //     render: (item: any) => item?.name,
      //   },
      // },
      {
        title: 'Email',
        name: 'email',
        tableItem: {},
      },
      {
        title: 'routes.admin.user.Phone Number',
        name: 'phoneNumber',
        tableItem: {},
      },
      {
        title: 'Ngày tạo',
        name: 'createdOnDate',
        tableItem: {
          width: 120,
          sorter: true,
          render: (text: any) => dayjs(text).format(formatDate),
        },
      },
      {
        title: 'routes.admin.user.Action',
        tableItem: {
          width: 150,
          align: ETableAlign.center,
          render: (text: string, data: any) => {
            return (
              <div className={'flex gap-2'}>
                <Tooltip title={'Đổi mật khẩu'}>
                  <button
                    title={'Đổi mật khẩu'}
                    onClick={() => {
                      userFacade.set({ data, isVisibleChangePass: true });
                    }}
                  >
                    <Key className="icon-cud bg-gray-400 hover:bg-green-400" />
                  </button>
                </Tooltip>
                <Popconfirm
                  title={t(
                    !data.isLockedOut
                      ? 'components.datatable.areYouSureWantDisable'
                      : 'components.datatable.areYouSureWantEnable',
                  )}
                  onConfirm={() => (data.isLockedOut ? userFacade.unlock(data.id) : userFacade.lock(data.id))}
                  cancelText="Hủy bỏ"
                  placement="bottom"
                >
                  <Tooltip
                    title={t(data.isLockedOut ? 'components.datatable.Disabled' : 'components.datatable.Enabled') || ''}
                  >
                    <button
                      title={
                        t(data.isLockedOut ? 'components.datatable.Disabled' : 'components.datatable.Enabled') || ''
                      }
                    >
                      {data.isLockedOut ? (
                        <Disable className="icon-cud bg-yellow-700 hover:bg-yellow-500" />
                      ) : (
                        <Check className="icon-cud bg-green-600 hover:bg-green-400" />
                      )}
                    </button>
                  </Tooltip>
                </Popconfirm>
                <ToolTip title={t('routes.admin.Layout.Edit')}>
                  <button
                    title={t('routes.admin.Layout.Edit') || ''}
                    onClick={() => userFacade.getById({ id: data.id })}
                  >
                    <Edit className="icon-cud bg-teal-900 hover:bg-teal-700" />
                  </button>
                </ToolTip>
                <Popconfirm
                  title={t('components.datatable.areYouSureWant')}
                  onConfirm={() => userFacade.delete(data.id)}
                  cancelText="Hủy bỏ"
                  placement="bottom"
                >
                  <Tooltip title="Xóa">
                    <button title={t('routes.admin.Layout.Delete') || ''}>
                      <Trash className="icon-cud bg-red-600 hover:bg-red-400" />
                    </button>
                  </Tooltip>
                </Popconfirm>
              </div>
            );
          },
        },
      },
    ];
  },
  form: (): FormModel[] => {
    return [
      {
        title: 'routes.admin.user.Full name',
        name: 'name',
        formItem: {
          rules: [{ type: EFormRuleType.required }],
        },
      },
      {
        title: 'Email',
        name: 'email',
        formItem: {
          disabled: (values: any) => {
            return values?.email !== null && values?.email !== undefined;
          },
          rules: [{ type: EFormRuleType.required }, { type: EFormRuleType.email }],
        },
      },
      {
        title: 'columns.auth.login.password',
        name: 'password',
        formItem: {
          type: EFormType.password,
          condition: (value: string, form: any, index: number, values: any) => !values?.id,
          rules: [{ type: EFormRuleType.required }],
        },
      },
      {
        title: 'columns.auth.register.retypedPassword',
        name: 'retypedPassword',
        formItem: {
          placeholder: 'columns.auth.register.retypedPassword',
          type: EFormType.password,
          condition: (value: string, form: any, index: number, values: any) => !values?.id,
          rules: [
            { type: EFormRuleType.required },
            {
              type: EFormRuleType.custom,
              validator: ({ getFieldValue }: any) => ({
                validator(rule: any, value: string) {
                  if (!value || getFieldValue('password') === value || value.length < 8) {
                    return Promise.resolve();
                  }
                  const { t } = useTranslation();
                  return Promise.reject(t('components.form.ruleConfirmPassword'));
                },
              }),
            },
          ],
        },
      },
      {
        title: 'Số điện thoại',
        name: 'phoneNumber',
        formItem: {
          col: 6,
          rules: [{ type: EFormRuleType.required }, { type: EFormRuleType.phone, min: 10, max: 15 }],
        },
      },
      {
        title: 'routes.admin.user.Date of birth',
        name: 'birthdate',
        formItem: {
          col: 6,
          type: EFormType.date,
          rules: [{ type: EFormRuleType.required }],
        },
      },
      // {
      //   title: 'Giới tính',
      //   name: 'gender',
      //   formItem: {
      //     col: 6,
      //     type: EFormType.select,
      //     list: [
      //       { label: 'Nam', value: 'MALE' },
      //       { label: 'Nữ', value: 'FEMALE' },
      //     ],
      //     rules: [{ type: EFormRuleType.required }],
      //   },
      // },
      // {
      //   title: 'Active',
      //   name: 'isActive',
      //   formItem: {
      //     col: 3,
      //     type: EFormType.switch,
      //   },
      // },
      // {
      //   title: 'Lock',
      //   name: 'isLockedOut',
      //   formItem: {
      //     col: 3,
      //     type: EFormType.switch,
      //   },
      // },
    ];
  },
  formChangePass: (): FormModel[] => {
    return [
      {
        title: 'Mật khẩu cũ',
        name: 'oldPassword',
        formItem: {
          type: EFormType.password,
          rules: [{ type: EFormRuleType.required }],
        },
      },
      {
        title: 'Mật khẩu mới',
        name: 'password',
        formItem: {
          type: EFormType.password,
          rules: [{ type: EFormRuleType.required }],
        },
      },
      {
        title: 'Nhập lại mật khẩu mới',
        name: 'retypedPassword',
        formItem: {
          placeholder: 'Nhập lại mật khẩu mới',
          type: EFormType.password,
          rules: [
            { type: EFormRuleType.required },
            {
              type: EFormRuleType.custom,
              validator: ({ getFieldValue }: any) => ({
                validator(rule: any, value: string) {
                  if (!value || getFieldValue('password') === value || value.length < 8) {
                    return Promise.resolve();
                  }
                  const { t } = useTranslation();
                  return Promise.reject(t('components.form.ruleConfirmPassword'));
                },
              }),
            },
          ],
        },
      },
    ];
  },
};
