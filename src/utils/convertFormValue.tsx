import { EFormModeSelect, EFormType, FormModel } from '@models';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export const convertFormValue = (columns: FormModel[], values: { [selector: string]: any }, exportData = true) => {
  columns
    .filter((item) => !!item && !!item.formItem)
    .map((item) => {
      if (item.formItem && item.formItem.convert) {
        values[item.name] = item.formItem.convert(values[item.name]);
      } else {
        switch (item.formItem!.type) {
          case EFormType.switch:
            if (typeof values[item.name] === 'undefined') values[item.name] = false;
            break;
          case EFormType.upload:
            if (values[item.name] && typeof values[item.name] === 'object' && exportData) {
              if (!item.formItem?.mode && values[item.name].length > 0) values[item.name] = values[item.name];
              else if (values[item.name].length > 1) {
                values[item.name] = values[item.name].filter((_item: any) => _item.status === 'done' || !_item.status);
              } else if (values[item.name].length == 0 && item.formItem?.mode != EFormModeSelect.multiple) {
                values[item.name] = null;
              }
            }
            break;
          case EFormType.date:
            if (values[item.name]) {
              if (exportData) {
                values[item.name] = dayjs(values[item.name]).format('YYYY-MM-DDTHH:mm:ss[Z]');
              } else values[item.name] = dayjs(values[item.name]);
            }
            break;
          case EFormType.dateRange:
            if (!!values[item.name] || typeof item.name === 'object') {
              if (exportData) {
                values[item.name] = [
                  values[item.name][0].startOf('day').utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
                  values[item.name][1].endOf('day').utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
                ];
              } else values[item.name] = [dayjs(values[item.name][0]), dayjs(values[item.name][1])];
            }
            break;
          case EFormType.number:
            if (!exportData && values && (values[item.name] || values[item.name] === 0))
              values[item.name] = values[item.name].toString();
            if (exportData) values[item.name] = parseFloat(values[item.name]);
            break;
          case EFormType.stringNumber:
            if (values && (values[item.name] || values[item.name] === 0))
              values[item.name] = values[item.name].toString();
            break;
          case EFormType.tab:
            if (!exportData) {
              item?.formItem?.list?.sort((a: any, b: any) =>
                a[item!.formItem!.tab!] < b[item!.formItem!.tab!]
                  ? -1
                  : a[item!.formItem!.tab!] > b[item!.formItem!.tab!]
                    ? 1
                    : 0,
              );
              values[item.name] = item?.formItem?.list?.map((subItem, i) => {
                const result: { [selector: string]: any } = {
                  [item!.formItem!.tab!]: values[item.name]
                    ? values[item.name][i][item!.formItem!.tab!]
                    : subItem.value,
                };
                item!
                  .formItem!.column!.filter((col) => !!col.formItem)
                  .forEach((col) => {
                    switch (col!.formItem!.type) {
                      case 'upload':
                        result[col.name] =
                          values[item.name]?.length && values[item.name]
                            ? values[item.name][i][col.name] || null
                            : null;
                        break;
                      default:
                        result[col.name] =
                          values[item.name]?.length && values[item.name] ? values[item.name][i][col.name] || '' : '';
                    }
                  });
                return result;
              });
              if (values[item.name]?.length) {
                values[item.name]?.sort((a: any, b: any) =>
                  a[item!.formItem!.tab!] < b[item!.formItem!.tab!]
                    ? -1
                    : a[item!.formItem!.tab!] > b[item!.formItem!.tab!]
                      ? 1
                      : 0,
                );
              }
            }
            break;
          case EFormType.select:
            if (!exportData && item?.formItem?.mode === 'multiple' && values[item.name]) {
              values[item.name] = values[item.name].map((item: any) => (item.id ? item.id : item));
            }
            break;
          case EFormType.treeSelect:
            if (values[item.name])
              values[item.name] = exportData ? values[item.name].value : { value: values[item.name] };
            break;
          case EFormType.textarea:
            if (!exportData && !values[item.name]) values[item.name] = '';
            break;
          case EFormType.chips:
            if (!exportData && !values[item.name]) values[item.name] = [];
            break;
          default:
            if (!item?.formItem?.mask && typeof values[item.name] === 'string') {
              values[item.name] = values[item.name].trim();
            } else if (
              !!item?.formItem?.mask &&
              item?.formItem?.mask?.alias === 'numeric' &&
              item?.formItem?.mask?.groupSeparator &&
              item?.formItem?.mask?.radixPoint &&
              item?.formItem?.mask?.onBeforePaste
            ) {
              values[item.name] =
                values[item.name] &&
                values[item.name]
                  .trim()
                  .replaceAll(item.formItem.mask.groupSeparator, '')
                  .replaceAll(item.formItem.mask.radixPoint, '.');
            }
        }
      }
      return item;
    });
  return values;
};
