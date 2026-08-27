import {
  Checkbox,
  DatePicker as DateAntDesign,
  Form as AntForm,
  FormInstance,
  Input,
  Radio,
  Slider,
  Spin,
  Switch,
  TimePicker,
} from 'antd';
import { InputOTP } from 'antd-input-otp';
import classNames from 'classnames';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rule } from 'antd/es/form';
import { FormItemProps } from 'antd/es/form/FormItem';

import { EFormRuleType, EFormType, FormItem, FormModel } from '@models';
import { GlobalFacade } from '@store';
import { Check, Times } from '@svgs';
import { convertFormValue } from '@utils';
import TextArea from 'antd/es/input/TextArea';
import { Button } from '../button';
import { Upload } from '../upload';
import {
  Addable,
  Cascader,
  Chips,
  DatePicker,
  Editor,
  Mask,
  Password,
  Select,
  SelectTable,
  SelectTag,
  Tab,
  TableTransfer,
  TreeSelect,
} from './input';

export const Form = ({
  className,
  columns,
  textSubmit = 'components.form.modal.save',
  textCancel = 'components.datatable.cancel',
  handSubmit,
  handCancel,
  values = {},
  widthLabel,
  checkHidden = false,
  extendForm,
  extendButton,
  idSubmit = 'idSubmit',
  disableSubmit = false,
  spinning = false,
  formAnt,
}: Type) => {
  const { t } = useTranslation();
  const { formatDate } = GlobalFacade();
  const [_columns, set_columns] = useState<FormModel[]>([]);
  const timeout = useRef<any>();
  const refLoad = useRef(true);
  const [_render, set_render] = useState(false);
  const [forms] = AntForm.useForm();
  const form = formAnt || forms;

  const reRender = () => {
    set_render(!_render);
    refLoad.current = false;
  };

  const handleFilter = useCallback(() => {
    columns = columns.filter((item: any) => !!item && !!item.formItem);
    if (
      JSON.stringify(
        _columns.map(({ name, formItem }: FormModel) => ({
          name,
          formItem: {
            list: formItem?.list?.map((e) => e.value),
            disabled: formItem?.disabled ? formItem?.disabled(values, form) : false,
          },
        })),
      ) !==
      JSON.stringify(
        columns.map(({ name, formItem }: FormModel) => ({
          name,
          formItem: {
            list: formItem?.list?.map((e) => e.value),
            disabled: formItem?.disabled ? formItem?.disabled(values, form) : false,
          },
        })),
      )
    ) {
      set_columns(columns);
    }
  }, [columns, values, _columns]);

  useEffect(() => {
    if (form && refLoad.current) {
      form.resetFields();
      form.setFieldsValue(convertFormValue(columns, values, false));
    }
    refLoad.current = true;
  }, [values]);

  useEffect(() => {
    handleFilter();
  }, [handleFilter, values]);

  const generateInput = (formItem: FormItem, item: FormModel, values: any, name: string) => {
    switch (formItem.type) {
      case EFormType.hidden:
        return <input type={'hidden'} name={item.name} tabIndex={-1} />;
      case EFormType.stringNumber:
        return (
          <Input
            type={'number'}
            name={item.name}
            maxLength={formItem.maxLength}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
            onBlur={(e: any) => formItem.onBlur && formItem.onBlur(e.target.value, form, name)}
            onChange={(e: any) => formItem.onChange && formItem.onChange(e.target.value, form, reRender)}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        );
      case EFormType.tab:
        return <Tab name={item.name} generateForm={generateForm} column={formItem.column} list={formItem.list} />;
      case EFormType.addable:
        return (
          <Addable
            name={item.name}
            column={formItem.column}
            textAdd={formItem.textAdd}
            onAdd={formItem.onAdd}
            isTable={formItem.isTable}
            showRemove={formItem.showRemove}
            idCheck={formItem.idCheck}
            generateForm={generateForm}
            form={form}
          />
        );
      case EFormType.editor:
        return (
          <Editor
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
          />
        );
      case EFormType.upload:
        return <Upload multiple={!!formItem.mode} action={formItem.action} />;
      case EFormType.tableTransfer:
        return <TableTransfer formItem={formItem} form={form} />;
      case EFormType.password:
        return (
          <Password
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        );
      case EFormType.textarea:
        return (
          <TextArea
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            rows={3}
            maxLength={1000}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
            onChange={(e) => formItem.onChange && formItem.onChange(e.target.value, form, reRender)}
          />
        );
      case EFormType.slider:
        return (
          <Slider
            tooltip={{ formatter: (value = 0) => formItem.sliderMarks && formItem.sliderMarks[value] }}
            max={formItem.max ? formItem.max : 100}
            min={formItem.min ? formItem.min : 0}
            marks={formItem.sliderMarks}
          />
        );
      case EFormType.sliderNumber:
        return (
          <Slider
            range
            tooltip={{
              formatter: (value) =>
                (value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0') +
                (formItem.symbol ? formItem.symbol : ''),
            }}
            max={formItem.max ? formItem.max : 9999999}
          />
        );
      case EFormType.date:
        return (
          <DatePicker
            format={
              !formItem.picker || formItem.picker === 'date'
                ? (formatDate || '') + (formItem.showTime ? ' HH:mm' : '')
                : formatDate || ''
            }
            onChange={(date: any) => formItem.onChange && formItem.onChange(date, form, reRender)}
            disabledDate={(current: any) => (formItem.disabledDate ? formItem.disabledDate(current, form) : false)}
            showTime={!!formItem.showTime}
            picker={formItem.picker || 'date'}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            form={form}
            name={item.name}
            placeholder={t(formItem.placeholder || '') || t('components.form.Select Date') || ''}
          />
        );
      case EFormType.dateRange:
        return (
          <DateAntDesign.RangePicker
            onCalendarChange={(date) => {
              form.setFieldValue(
                item.name,
                date?.filter((i) => !!i),
              );
              formItem.onChange &&
                formItem.onChange(
                  date?.filter((i) => !!i),
                  form,
                  reRender,
                );
            }}
            onOpenChange={(open) => {
              if (!open && form.getFieldValue(item.name)?.length < 2) form.resetFields([item.name]);
            }}
            format={formatDate + (formItem.showTime ? ' HH:mm' : '')}
            disabledDate={(current) => (formItem.disabledDate ? formItem.disabledDate(current, form) : false)}
            defaultValue={
              formItem.initialValues && [dayjs(formItem.initialValues.start), dayjs(formItem.initialValues.end)]
            }
            showTime={formItem.showTime}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        );
      case EFormType.time:
        return (
          <TimePicker
            minuteStep={10}
            format={'HH:mm'}
            onChange={(date: any) => formItem.onChange && formItem.onChange(date, form, reRender)}
            disabledDate={(current: any) => (formItem.disabledDate ? formItem.disabledDate(current, form) : false)}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            name={item.name}
            placeholder={t(formItem.placeholder || '') || t('components.form.Select Date') || ''}
          />
        );
      case EFormType.timeRange:
        return (
          <TimePicker.RangePicker
            minuteStep={10}
            onCalendarChange={(date) => {
              form.setFieldValue(
                item.name,
                date?.filter((i) => !!i),
              );
              formItem.onChange &&
                formItem.onChange(
                  date?.filter((i) => !!i),
                  form,
                  reRender,
                );
            }}
            onOpenChange={(open) => {
              if (!open && form.getFieldValue(item.name)?.length < 2) form.resetFields([item.name]);
            }}
            format={'HH:mm'}
            disabledDate={(current) => (formItem.disabledDate ? formItem.disabledDate(current, form) : false)}
            defaultValue={
              formItem.initialValues && [dayjs(formItem.initialValues.start), dayjs(formItem.initialValues.end)]
            }
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        );
      case EFormType.checkbox:
        return formItem.list ? (
          <Checkbox.Group
            options={formItem.list}
            onChange={(value) => formItem.onChange && formItem.onChange(value, form, reRender)}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        ) : (
          <Checkbox
            onChange={(value) => formItem.onChange && formItem.onChange(value.target.checked, form, reRender)}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          >
            {formItem.label}
          </Checkbox>
        );
      case EFormType.radio:
        return (
          <Radio.Group
            options={formItem.list}
            optionType={'button'}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            onChange={({ target }) => formItem.onChange && formItem.onChange(target.value, form, reRender)}
          />
        );
      case EFormType.tag:
        return (
          <SelectTag
            maxTagCount={formItem.maxTagCount || 'responsive'}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
            tag={formItem.tag}
            form={form}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        );
      case EFormType.chips:
        return (
          <Chips
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            list={formItem.list}
          />
        );
      case EFormType.select:
        return (
          <Select
            showSearch={formItem.showSearch}
            maxTagCount={formItem.maxTagCount || 'responsive'}
            onChange={(value: any) => formItem.onChange && formItem.onChange(value, form, reRender)}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Choose') + ' ' + t(item.title)!.toLowerCase()
            }
            // formItem={formItem}
            form={form}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            get={formItem.get}
            list={formItem.list}
            mode={formItem.mode}
          />
        );
      case EFormType.selectTable:
        return (
          <SelectTable
            onChange={(value: any) => formItem.onChange && formItem.onChange(value, form, reRender)}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Choose') + ' ' + t(item.title)!.toLowerCase()
            }
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            // formItem={formItem}
            get={formItem.get}
          />
        );
      case EFormType.treeSelect:
        return (
          <TreeSelect
            formItem={formItem}
            showSearch={formItem.showSearch}
            form={form}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Choose') + ' ' + t(item.title)!.toLowerCase()
            }
          />
        );
      case EFormType.cascader:
        return (
          <Cascader
            formItem={formItem}
            showSearch={formItem.showSearch}
            form={form}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Choose') + ' ' + t(item.title)!.toLowerCase()
            }
          />
        );
      case EFormType.switch:
        return (
          <Switch
            // checkedChildren={<Check className="h-5 w-5 fill-white" />}
            // unCheckedChildren={<Times className="h-5 w-5 fill-white" />}
            defaultChecked={!!values && values[item.name || ''] === 1}
            onChange={(e) => formItem.onChange && formItem.onChange(e, form, reRender)}
          />
        );
      case EFormType.otp:
        return <InputOTP inputType="numeric" length={formItem.maxLength || 5} />;
      default:
        // @ts-ignore
        return (
          <Mask
            list={formItem.list}
            form={form}
            mask={formItem.mask}
            addonBefore={formItem.addonBefore}
            addonAfter={formItem.addonAfter}
            maxLength={formItem.maxLength}
            placeholder={
              t(formItem.placeholder || '') || t('components.form.Enter') + ' ' + t(item.title)!.toLowerCase()
            }
            onBlur={(e: any) => formItem.onBlur && formItem.onBlur(e.target.value, form, name)}
            onChange={(e: any) => formItem.onChange && formItem.onChange(e.target.value, form, reRender)}
            disabled={!!formItem.disabled && formItem.disabled(values, form)}
          />
        );
    }
  };
  const generateForm = (item: any, index: number, showLabel = true, name?: string) => {
    if (!!item?.formItem?.condition && !item?.formItem?.condition(values[item.name], form, index, values)) return;
    if (item?.formItem?.render) return item?.formItem?.render(form, values, generateForm, index, reRender);
    if (item.formItem) {
      const rules: Rule[] = [];
      if (!item.formItem.type) item.formItem.type = EFormType.text;

      if (item.formItem.rules) {
        item.formItem.rules
          .filter((item: any) => !!item)
          .map((rule: any) => {
            switch (rule.type) {
              case EFormRuleType.required:
                switch (item.formItem.type) {
                  case EFormType.text:
                  case EFormType.name:
                  case EFormType.number:
                  case EFormType.stringNumber:
                  case EFormType.hidden:
                  case EFormType.password:
                  case EFormType.textarea:
                    rules.push({
                      required: true,
                      whitespace: true,
                      message: t(rule.message || 'components.form.ruleRequired', {
                        title: t(item.title),
                      }),
                    });
                    break;
                  default:
                    rules.push({
                      required: true,
                      message: t(
                        rule.message ||
                          (item.formItem.type !== EFormType.otp
                            ? 'components.form.ruleRequiredSelect'
                            : 'components.form.ruleRequired'),
                        {
                          title: t(item.title),
                        },
                      ),
                    });
                    break;
                }
                break;
              case EFormRuleType.email:
                rules.push(() => ({
                  validator(_: any, value: any) {
                    const regexEmail =
                      /^(([^<>()[\]\\.,;:$%^&*\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (!value || (typeof value === 'string' && regexEmail.test(value.trim())))
                      return Promise.resolve();
                    else if (
                      typeof value === 'object' &&
                      value.length > 0 &&
                      value.filter((item: any) => !regexEmail.test(item)).length === 0
                    )
                      return Promise.resolve();
                    return Promise.reject(t(rule.message || 'components.form.ruleEmail'));
                  },
                }));
                break;
              case EFormRuleType.phone:
                rules.push(() => ({
                  validator(_: any, value: any) {
                    if (!value) return Promise.resolve();
                    else if (/^\d+$/.test(value)) {
                      if (value?.trim().length < 10)
                        return Promise.reject(t('components.form.ruleMinNumberLength', { min: 10 }));
                      else if (value?.trim().length > 12)
                        return Promise.reject(t('components.form.ruleMaxNumberLength', { max: 12 }));
                      else return Promise.resolve();
                    } else return Promise.reject(t('components.form.only number'));
                  },
                }));
                break;
              case EFormRuleType.min:
                if (item.formItem.type === EFormType.number)
                  rules.push(() => ({
                    validator(_: any, value: any) {
                      if (!value || /^0$|^-?[1-9]\d*(\.\d+)?$/.test(value)) {
                        if (/^0$|^-?[1-9]\d*(\.\d+)?$/.test(value)) {
                          if (parseFloat(value) < rule.value) {
                            return Promise.reject(t(rule.message || 'components.form.ruleMin', { min: rule.value }));
                          }
                        }
                      }
                      return Promise.resolve();
                    },
                  }));
                else {
                  if (!rule.message) {
                    switch (item.formItem.type) {
                      case EFormType.onlyNumber:
                        rule.message = t('components.form.ruleMinNumberLength', { min: rule.value });
                        break;
                      default:
                        rule.message = t('components.form.ruleMinLength', { min: rule.value });
                    }
                  }
                  rules.push({
                    type: item.formItem.type === EFormType.number ? 'number' : 'string',
                    min: rule.value,
                    message: rule.message,
                  });
                }
                break;
              case 'max':
                if (item.formItem.type === EFormType.number)
                  rules.push(() => ({
                    validator(_: any, value: any) {
                      if (!value || /^0$|^-?[1-9]\d*(\.\d+)?$/.test(value)) {
                        if (/^0$|^-?[1-9]\d*(\.\d+)?$/.test(value)) {
                          if (parseFloat(value) > rule.value) {
                            return Promise.reject(t(rule.message || 'components.form.ruleMax', { max: rule.value }));
                          }
                        }
                      }
                      return Promise.resolve();
                    },
                  }));
                else {
                  if (!rule.message) {
                    switch (item.formItem.type) {
                      case EFormType.onlyNumber:
                        rule.message = t('components.form.ruleMaxNumberLength', { max: rule.value });
                        break;
                      default:
                        rule.message = t('components.form.ruleMaxLength', { max: rule.value });
                    }
                  }
                  rules.push({
                    type: item.formItem.type === EFormType.number ? 'number' : 'string',
                    max: rule.value,
                    message: rule.message,
                  });
                }
                break;
              case EFormRuleType.url:
                rules.push({
                  type: 'url',
                  message: t(rule.message || 'components.form.incorrectPathFormat'),
                });
                break;
              case EFormRuleType.onlyText:
                rules.push(() => ({
                  validator(_: any, value: any) {
                    if (!value || /^[A-Za-z]+$/.test(value)) return Promise.resolve();
                    return Promise.reject(t(rule.message || 'components.form.only text'));
                  },
                }));
                break;
              case EFormRuleType.onlyTextSpace:
                rules.push(() => ({
                  validator(_: any, value: any) {
                    if (!value || /^[a-zA-Z ]+$/.test(value)) return Promise.resolve();
                    return Promise.reject(t(rule.message || 'components.form.only text'));
                  },
                }));
                break;
              case EFormRuleType.textarea:
                rules.push(() => ({
                  validator(_: any, value: any) {
                    if (value?.trim().length > 500) {
                      return Promise.reject(t(rule.message || 'components.form.ruleMaxLength', { max: 500 }));
                    }
                    return Promise.resolve();
                  },
                }));
                break;
              case EFormRuleType.custom:
                rules.push(rule.validator);
                break;
              default:
            }
            return rule;
          });
      }
      if (!item.formItem.notDefaultValid)
        switch (item.formItem.type) {
          case EFormType.number:
            rules.push(() => ({
              validator(_: any, value: any) {
                if (!value || (/^-?[1-9]*\d+(\.\d{1,2})?$/.test(value) && parseInt(value) < 1000000000))
                  return Promise.resolve();
                return Promise.reject(t('components.form.only number'));
              },
            }));
            break;
          case EFormType.name:
            rules.push(() => ({
              validator(_: any, value: any) {
                if (!value || /^[A-Za-zÀ-Ỹà-ỹ]+[A-Za-zÀ-Ỹà-ỹ\s-]*$/u.test(value)) return Promise.resolve();
                return Promise.reject(t('components.form.only text'));
              },
            }));
            break;
          case EFormType.password:
            rules.push(() => ({
              validator: async (_: any, value: any) => {
                if (value) {
                  let min = 8;
                  rules.forEach((item: any) => item.min && (min = item.min));
                  if (value.trim().length < min)
                    return Promise.reject(t('components.form.ruleMinNumberLength', { min }));
                  // if (/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(value))
                  //   return Promise.resolve();
                  // else return Promise.reject(t('components.form.rulePassword'));
                } else return Promise.resolve();
              },
            }));
            break;
          case EFormType.onlyNumber:
            rules.push(() => ({
              validator(_: any, value: any) {
                if (!value || /^[0-9]+$/.test(value)) return Promise.resolve();
                return Promise.reject(t('components.form.only number'));
              },
            }));
            break;
          case EFormType.otp:
            rules.push(() => ({
              validator(_: any, value: any) {
                if (value && value.length < (item.formItem.maxLength || 5)) {
                  return Promise.reject(t('components.form.ruleMinLength', { min: item.formItem.maxLength || 5 }));
                }
                return Promise.resolve();
              },
            }));
            break;
          default:
        }

      const otherProps: FormItemProps = {
        // key: index,
        label: showLabel && t(item.title),
        name: name || item.name,
        labelAlign: 'left',
        rules: [],
        // validateTrigger: 'onBlur',
      };
      if (rules.length) otherProps.rules = rules;
      if (widthLabel) otherProps.labelCol = { flex: widthLabel };

      switch (item.formItem.type) {
        case EFormType.switch:
        case EFormType.checkbox:
          otherProps.valuePropName = 'checked';
          break;
        case EFormType.hidden:
          otherProps.hidden = true;
          break;
        case EFormType.select:
        case EFormType.upload:
        case EFormType.otp:
          otherProps.validateTrigger = 'onChange';
          break;
        default:
      }

      return item.formItem.type !== EFormType.addable ? (
        <AntForm.Item {...otherProps}>{generateInput(item.formItem, item, values, otherProps.name)}</AntForm.Item>
      ) : (
        generateInput(item.formItem, item, values, otherProps.name)
      );
    }
    return null;
  };

  const handFinish = (values: any) => {
    values = convertFormValue(columns, values);
    handSubmit && handSubmit(values);
  };

  return (
    <Spin spinning={spinning}>
      <AntForm
        scrollToFirstError={true}
        requiredMark={true}
        className={classNames(className)}
        form={form}
        layout={!widthLabel ? 'vertical' : 'horizontal'}
        onFinishFailed={(failed) =>
          failed?.errorFields?.length && form?.scrollToField(failed?.errorFields[0].name, { behavior: 'smooth' })
        }
        onFinish={handFinish}
        onValuesChange={async (objValue) => {
          if (form && checkHidden) {
            clearTimeout(timeout.current);
            timeout.current = setTimeout(async () => {
              for (const key in objValue) {
                if (Object.prototype.hasOwnProperty.call(objValue, key))
                  columns.filter((_item: any) => _item.name === key);
              }
              refLoad.current = false;
              set_columns(columns);
              handleFilter();
            }, 500);
          }
        }}
      >
        <div className={'group-input group-input-profile'}>
          <div className={'grid gap-x-5 grid-cols-12 group-input'}>
            {_columns.map(
              (column: any, index: number) =>
                (!column?.formItem?.condition ||
                  !!column?.formItem?.condition(values[column.name], form, index, values)) && (
                  <div
                    className={classNames(
                      'col-span-12 ' +
                        (column?.formItem?.type || EFormType.text) +
                        (' sm:col-span-' + (column?.formItem?.col ? column?.formItem?.col : 12)) +
                        (' lg:col-span-' + (column?.formItem?.col ? column?.formItem?.col : 12)),
                    )}
                    key={index}
                  >
                    {generateForm(column, index)}
                  </div>
                ),
            )}
          </div>

          {extendForm && extendForm(values)}
        </div>

        <div
          id="buttonWrapper"
          className={classNames('gap-7 flex sm:block mt-2', {
            'items-center sm:flex-row': handCancel && handSubmit,
            'md:inline-flex w-full justify-end': handSubmit,
            'sm:w-auto text-center items-center sm:flex-row flex-col': handSubmit && extendButton,
            '!w-full sm:inline-flex text-center justify-end items-center sm:flex-row':
              !handSubmit && (handCancel || extendButton),
          })}
        >
          {handCancel && (
            <Button
              text={t(textCancel)}
              className={'sm:min-w-32 justify-center out-line !border-black w-full sm:w-auto'}
              onClick={handCancel}
            />
          )}
          {extendButton && extendButton(form)}
          {handSubmit && (
            <Button
              text={t(textSubmit)}
              id={idSubmit}
              onClick={() => form && form.submit()}
              disabled={disableSubmit || spinning}
              className={'sm:min-w-24 justify-center w-full sm:w-auto'}
            />
          )}
        </div>
      </AntForm>
    </Spin>
  );
};
type Type = {
  className?: string;
  columns: FormModel[];
  textSubmit?: string;
  textCancel?: string;
  handSubmit?: (values: any) => void;
  handCancel?: () => void;
  values?: any;
  formAnt?: FormInstance;
  onFirstChange?: () => void;
  widthLabel?: string;
  checkHidden?: boolean;
  extendForm?: (values: any) => JSX.Element;
  extendButton?: (values: any) => JSX.Element;
  idSubmit?: string;
  disableSubmit?: boolean;
  spinning?: boolean;
};
