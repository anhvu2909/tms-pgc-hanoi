import { DataTableModel, EFormRuleType, EFormType, ETableAlign, ETableFilterType, FormModel } from '@models';
import dayjs from 'dayjs';
import { ToolTip } from '@core/tooltip';
import { PopConfirm } from '@core/pop-confirm';
import { Edit, Trash } from '@svgs';
import React from 'react';
import { CodeTypeManagementFacade, GlobalFacade, TypesCodeTypeManagementFacade } from '@store';
import { useTranslation } from 'react-i18next';
import slug from 'slug';
import { FormInstance } from 'antd';
import { useNavigate } from 'react-router';

export default {
  table: (): DataTableModel[] => {
    const { formatDate } = GlobalFacade();
    const { t } = useTranslation();
    const codeTypeManagementFacade = CodeTypeManagementFacade();
    const navigate = useNavigate();
    return [
      {
        title: 'STT',
        name: 'stt',
        tableItem: {
          width: 50,
        },
      },
      {
        title: 'Mã',
        name: 'code',
        tableItem: {
          width: 150,
          filter: { type: ETableFilterType.search },
          sorter: true,
        },
      },
      {
        title: 'routes.admin.Code.Name',
        name: 'title',
        tableItem: {
          filter: { type: ETableFilterType.search },
          sorter: true,
          onClick: () => navigate(''),
        },
      },
      {
        title: 'Ngày tạo',
        name: 'createdOnDate',
        tableItem: {
          width: 150,
          filter: { type: ETableFilterType.date },
          sorter: true,
          render: (text: any) => dayjs(text).format(formatDate),
        },
      },
      {
        title: 'routes.admin.user.Action',
        tableItem: {
          width: 100,
          align: ETableAlign.center,
          render: (text: string, data: any) => (
            <div className={'flex justify-center gap-2'}>
              {/*<ToolTip title={t(data.isDisabled ? 'components.datatable.Disabled' : 'components.datatable.Enabled')}>*/}
              {/*  <PopConfirm*/}
              {/*    title={t(*/}
              {/*      !data.isDisabled*/}
              {/*        ? 'components.datatable.areYouSureWantDisable'*/}
              {/*        : 'components.datatable.areYouSureWantEnable',*/}
              {/*    )}*/}
              {/*    onConfirm={() => codeFacade.putDisable({ id: data.id, disable: !data.isDisabled })}*/}
              {/*  >*/}
              {/*    <button*/}
              {/*      title={t(data.isDisabled ? 'components.datatable.Disabled' : 'components.datatable.Enabled') || ''}*/}
              {/*    >*/}
              {/*      {data.isDisabled ? (*/}
              {/*        <Disable className="icon-cud bg-yellow-700 hover:bg-yellow-500" />*/}
              {/*      ) : (*/}
              {/*        <Check className="icon-cud bg-green-600 hover:bg-green-400" />*/}
              {/*      )}*/}
              {/*    </button>*/}
              {/*  </PopConfirm>*/}
              {/*</ToolTip>*/}
              <ToolTip title={t('routes.admin.Layout.Edit')}>
                <button
                  title={t('routes.admin.Layout.Edit') || ''}
                  onClick={() => codeTypeManagementFacade.getById({ id: data.id })}
                >
                  <Edit className="icon-cud bg-teal-900 hover:bg-teal-700" />
                </button>
              </ToolTip>
              <ToolTip title={t('routes.admin.Layout.Delete')}>
                <PopConfirm
                  title={t('components.datatable.areYouSureWant')}
                  onConfirm={() => codeTypeManagementFacade.delete(data.id)}
                >
                  <button title={t('routes.admin.Layout.Delete') || ''}>
                    <Trash className="icon-cud bg-red-600 hover:bg-red-400" />
                  </button>
                </PopConfirm>
              </ToolTip>
            </div>
          ),
        },
      },
    ];
  },
  form: (): FormModel[] => {
    const typesCodeTypeManagementFacade = TypesCodeTypeManagementFacade();
    return [
      {
        title: 'Danh mục',
        name: 'type',
        formItem: {
          type: EFormType.select,
          list: typesCodeTypeManagementFacade.pagination?.content.map((item: any) => ({
            label: item.title,
            value: item.code,
          })),
          rules: [{ type: EFormRuleType.required }],
        },
      },
      {
        title: 'Tiêu đề',
        name: 'title',
        formItem: {
          rules: [{ type: EFormRuleType.required }],
          onBlur: (e: any, form: any) => {
            if (e.target.value && !form.getFieldValue('code')) {
              form.setFieldValue('code', slug(e.target.value).toUpperCase());
            }
          },
        },
      },
      {
        title: 'Thứ tự',
        name: 'order',
        formItem: {
          type: EFormType.number,
        },
      },
      {
        title: 'Mã',
        name: 'code',
        formItem: {
          rules: [{ type: EFormRuleType.required }, { type: EFormRuleType.max, value: 100 }],
        },
      },
      {
        title: 'Mô tả',
        name: 'description',
        formItem: {
          type: EFormType.textarea,
        },
      },
      // {
      //   name: 'translations',
      //   title: '',
      //   formItem: {
      //     type: EFormType.tab,
      //     tab: 'language',
      //     list: [
      //       { label: 'English', value: 'en' },
      //       { label: 'Vietnam', value: 'vn' },
      //     ],
      //     column: [
      //       // { title: 'id', name: 'id', formItem: { type: EFormType.hidden } },
      //       {
      //         title: 'Tiêu đề',
      //         name: 'title',
      //         formItem: {
      //           rules: [{ type: EFormRuleType.required }],
      //           onBlur: (e: any, form: FormInstance, name: any) => {
      //             if (e?.target?.value && !form.getFieldValue(['translations', name[0], 'slug'])) {
      //               form.setFieldValue(['translations', name[0], 'slug'], slug(e?.target?.value));
      //             }
      //           },
      //         },
      //       },
      //       {
      //         title: 'Description',
      //         name: 'description',
      //         formItem: {
      //           type: EFormType.textarea,
      //         },
      //       },
      //     ],
      //   },
      // },
    ];
  },
};
