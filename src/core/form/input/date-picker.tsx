import { uuidv4 } from '@utils';
import { DatePicker, FormInstance } from 'antd';
import dayjs from 'dayjs';

const Component = ({
  form,
  name,
  id = 'date-picker-' + uuidv4(),
  onChange,
  format,
  disabledDate,
  showTime,
  picker,
  disabled,
  ...props
}: Type) => {
  return (
    <DatePicker
      className="w-full"
      id={id}
      onChange={onChange}
      format={format}
      disabledDate={disabledDate}
      showTime={showTime}
      picker={picker}
      disabled={disabled}
      {...props}
      onOpenChange={(e) => {
        if (!e) {
          const { value }: any = document.getElementById(id);
          const selectDate = dayjs(value, format || 'DD/MM/YYYY');
          if (
            selectDate.isValid() &&
            onChange &&
            name &&
            (!form ||
              (form.getFieldValue(name) &&
                form.getFieldValue(name).format(format || 'DD/MM/YYYY') !== selectDate.format(format || 'DD/MM/YYYY')))
          ) {
            onChange(selectDate, value);
          }
        }
      }}
    />
  );
};
type Type = {
  form: FormInstance;
  name?: string;
  placeholder?: string;
  id?: string;
  onChange: (selectDate: any, value: any) => void;
  format: string;
  disabledDate: (current: any) => boolean;
  showTime: boolean;
  picker: 'time' | 'date' | 'week' | 'month' | 'quarter' | 'year' | undefined;
  disabled: boolean;
};
export default Component;
