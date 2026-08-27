import React, { Fragment, PropsWithChildren } from 'react';
import { cssInObject, isNumeric } from '@utils';
import { MEditTable } from '@models';
import classNames from 'classnames';
import { Mask } from '@core/form/input';

export const EditTable = ({ table }: Type) => {
  const getTree = (t: any, returnKey?: string, depth = 0) => {
    if (!t?.children) return returnKey ? t[returnKey] : depth;
    else return t?.children?.flatMap((child: any) => getTree(child, returnKey, depth + 1));
  };
  const getDepth = (t: any, key = 'children', length = 0, index = 0) => {
    if (t && t[key]) {
      return Math.max(
        ...t[key].flatMap((child: any) => getDepth(child, key, t[key].length + index, index + (t[key].length - 1))),
      );
    }
    return length;
  };
  const getArrayByDepth = (array: any[], depth = 0, i: number, key = 'children'): any =>
    array.flatMap((j) => {
      if (depth !== i && j[key]) return getArrayByDepth(j[key], depth + 1, i, key);
      return j[key] || [];
    });
  const renderHeader = (depth = 0, i: number, table: MEditTable, rowSpan: number) => {
    let array = [
      ...(table?.fields?.rows ? table.fields.rows.map((key: string) => ({ key })) : []),
      ...(table?.fields?.columns ?? []),
    ];
    if (i > 0) array = getArrayByDepth(array, depth + 1, i);

    return array.map((i: any, index: number) => {
      return (
        <th key={index} colSpan={i.children ? getDepth(i) : 1} rowSpan={i.children ? i : rowSpan + 1}>
          {table.meta?.filter((m: any) => m.field === i.key)[0].name}
        </th>
      );
    });
  };
  const maxLevel = table.data ? Math.max(...table.data.map((i: any) => i.level)) : 0;
  const renderBody = (
    text: string,
    level: number,
    indexCol = 0,
    indexRow = 0,
    table: MEditTable,
    colBody: string[],
    key: string,
  ) => {
    const { type, formula } = table.meta!.filter((i: any) => i.field === key)[0];
    const { style } = table.data![indexRow];
    if (!formula) {
      if (type === 'number' && level === maxLevel) {
        return (
          <Mask
            className={'text-right border-0'}
            placeholder={'Nhập số'}
            mask={{
              alias: 'decimal',
              groupSeparator: '.',
              digits: 2,
              radixPoint: ',',
              digitsOptional: true,
              placeholder: '',
            }}
            onChange={(e: any) =>
              handleSum(e.target, e.target.value, indexRow, colBody[indexCol], table, type, maxLevel)
            }
            value={text ? parseFloat(text).toLocaleString('vi') : ''}
          />
        );
      }
      if (type === 'text') {
        return (
          <Mask
            className={'border-0'}
            placeholder={'Nhập text'}
            onChange={(e: any) =>
              handleSum(e.target, e.target.value, indexRow, colBody[indexCol], table, type, maxLevel)
            }
            value={text ?? ''}
          />
        );
      }
    }

    return (
      <p className={classNames({ 'text-right': type === 'number' })} style={cssInObject(style)}>
        {type === 'number' && text ? parseFloat(text).toLocaleString('vi') : text}
      </p>
    );
  };
  const listFormula = table.meta ? table.meta.filter((i) => !!i.formula).map((i) => i.formula!) : [];
  const handleSum = (
    e: Element,
    text: string | number,
    indexRow: number,
    name: string,
    table: MEditTable,
    type: string,
    maxLevel = 1,
  ) => {
    if (type === 'number') {
      table.data![indexRow][name] =
        typeof text === 'string' && text ? parseFloat(text.replaceAll('.', '').replace(',', '.')) : text || 0;
      const row = table.data![indexRow];

      let checkLast: number = -1;
      table.data?.forEach((i: any, index: number) => {
        if (checkLast === -1 && index >= indexRow && i.level !== row.level) checkLast = index - 1;
        if (checkLast === -1 && table.data!.length - 1 == index) checkLast = index;
      });

      let level: number = maxLevel;
      const tbody = e.closest('tbody');
      let total: number = 0;
      let maCha = row.maCha;
      const handleChangeTable = (item: any, i: number) => {
        if (level >= item.level) {
          if (tbody && level > item.level && item.level !== maxLevel) {
            const meta = table.meta?.filter((j) => j.field === name)[0];
            if (meta?.formula) {
              let formula = meta?.formula;
              table.meta?.forEach((i) => {
                if (i.field && formula.indexOf(i.field) > -1) {
                  formula = formula.replaceAll(i.field, item[i.field]);
                }
              });
              const value = eval(formula);
              total =
                !!value && value !== Infinity && !isNaN(value)
                  ? /^\d+$/.test(value)
                    ? value
                    : parseFloat(value.toFixed(2))
                  : 0;
            } else if (item.level <= row.level - 2) {
              total = table.data
                ?.filter((i) => i.level === item.level + 1 && !i.isSummary)
                .reduce((value, j) => value + j[name], 0);
            } else if (
              table?.totals?.row?.reverseSubLayout === true ||
              table?.totals?.row?.reverseSubLayout === undefined
            ) {
              total = table.data
                ?.filter((i) => i.idBieuNoiDung === row.idBieuNoiDung && i.maCha === row.maCha && i.level === row.level)
                .reduce((value, j) => value + j[name], 0);
            }
            if (table.data) table.data[i][name] = total;

            if (
              table.data &&
              (table.data[i].idBieuNoiDung === row.idBieuNoiDung ||
                table.data[i].ma === maCha ||
                table.data[i].maCha === maCha)
            ) {
              maCha = table.data[i - (table.data[i].isSummary && table.data[i - 1] ? 1 : 0)].maCha;
              tbody!.querySelector(`tr:nth-child(${i + 1}) td[data-name="${name}"] > *`)!.innerHTML =
                total.toLocaleString('vi');
              if (item.isSummary && i > 0 && table.data && table.data[i - 1].level === item.level) {
                if (table.data) table.data[i - 1][name] = total;
                tbody!.querySelector(`tr:nth-child(${i}) td[data-name="${name}"] > *`)!.innerHTML =
                  total.toLocaleString('vi');
              }
            }
            level = item.level;
          }
          if (!(table?.totals?.row?.reverseSubLayout === true || table?.totals?.row?.reverseSubLayout === undefined)) {
            total += isNumeric(item[name]) ? parseFloat(item[name]) : 0;
            level = item.level;
          }
        }
      };
      if (table?.totals?.row?.reverseSubLayout === true || table?.totals?.row?.reverseSubLayout === undefined)
        for (let i = checkLast; i >= 0; i--) handleChangeTable(table.data![i], i);
      else {
        const data: any = {};
        table?.totals?.row?.subTotalsDimensions?.forEach((key: string) => {
          table.data?.forEach((item: any) => {
            if (!data[item[key]]) data[item[key]] = [];
            data[item[key]].push(item);
          });
          for (let i = table.data!.indexOf(data[row[key]][0]); i <= checkLast + 1; i++) {
            handleChangeTable(table.data![i], i);
          }
        });
      }
      if (listFormula.length) {
        listFormula.forEach((i) => {
          if (i.indexOf(name) > -1) {
            const meta = table.meta?.filter((j) => j.formula === i)[0];
            if (meta?.field && meta?.type) {
              let formula = i;
              table.meta?.forEach((i) => {
                if (i.field && formula.indexOf(i.field) > -1) {
                  formula = formula.replaceAll(i.field, row[i.field]);
                }
              });
              const el = e
                .closest('tbody')!
                .querySelector(`tr:nth-child(${indexRow + 1}) td[data-name="${meta.field}"] > *`)!;
              let value = eval(formula);
              value =
                !!value && value !== Infinity && !isNaN(value)
                  ? /^\d+$/.test(value)
                    ? value
                    : parseFloat(value.toFixed(2))
                  : 0;
              el.innerHTML = value.toLocaleString('vi');
              handleSum(el, value, indexRow, meta.field, table, meta.type, maxLevel);
            }
          }
        });
      }
    } else table.data![indexRow][name] = text;
  };

  const renderTable = (table: any) => {
    const group: any = {};
    const rowSpan = Math.max(...table.fields.columns.flatMap((e: any) => getTree(e)));
    const colBody = [
      ...(table.fields.rows ? table.fields.rows.map((key: any) => ({ key })) : []),
      ...table.fields.columns,
    ].flatMap((e) => getTree(e, 'key'));
    const defaultData = colBody.reduce((a, v) => ({ ...a, [v]: undefined }), {});
    if (table?.totals?.row?.subTotalsDimensions) {
      const data: any = {};
      table?.totals?.row?.subTotalsDimensions.forEach((key: string) => {
        table.data.forEach((item: any) => {
          if (!data[item[key]]) data[item[key]] = [];
          data[item[key]].push(item);
        });
        table.fields.rows
          .filter((item: any) => table?.totals?.row?.subTotalsDimensions.indexOf(item) === -1)
          .map((i: any) => (defaultData[i] = table?.totals?.row?.subLabel || 'Tổng'));
        defaultData['level'] = 0;
        for (const value in data) {
          const item = data[value][data[value].length - 1];
          if (data[value].length > 1) {
            table.data.splice(table.data.indexOf(item) + 1, 0, { ...defaultData, [key]: item[key] });
          }
        }
      });
    }
    return (
      <table className={'table_border'}>
        <thead>
          {Array(rowSpan + 1)
            .fill(0)
            .map((j, i) => (
              <tr key={i}>{renderHeader(0, i, table, rowSpan)}</tr>
            ))}
        </thead>
        <tbody>
          {table.data.map((i: any, index: number) => {
            if (table.fields?.rows?.length) {
              table.fields?.rows?.map((key: string, indexKey: number) => {
                if (indexKey < table.fields?.rows?.length - 1) {
                  if (!group[key] || group[key].value !== i[key]) {
                    group[key] = {
                      value: i[table.fields?.rows[0]],
                      index: 0,
                      indexRow: 0,
                      row: table.data.filter((item: any) => item[key] === i[key]).length,
                    };
                  } else group[key].indexRow += 1;
                }
              });
            }

            return (
              <tr key={index}>
                {colBody.map((j, jI) => {
                  return (!group[j] && i[colBody[jI]] !== '') ||
                    group[j]?.indexRow === 0 ||
                    !table.fields?.rows?.length ? (
                    <td
                      rowSpan={group[j] ? group[j].row : 1}
                      colSpan={
                        jI < table.fields?.rows?.length && i[colBody[jI + 1]] === '' ? table.fields?.rows.length : 1
                      }
                      data-name={j}
                      key={jI}
                    >
                      {renderBody(i[j], i.level, jI, index, table, colBody, j)}
                    </td>
                  ) : null;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };
  return <Fragment>{table.data && renderTable(table)}</Fragment>;
};
EditTable.displayName = 'EditTable';
type Type = PropsWithChildren<{
  table: MEditTable;
}>;
