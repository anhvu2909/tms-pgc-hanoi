import { Eye, EyeSlash } from '@svgs';
import { useState } from 'react';

const Component = ({
  value = '',
  placeholder,
  disabled,
  ...prop
}: {
  value?: string;
  placeholder: string;
  disabled: boolean;
}) => {
  const [toggle, set_toggle] = useState(true);

  return (
    <div className="relative">
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        {...prop}
        type={toggle ? 'password' : 'text'}
        className="w-full text-gray-600 bg-white px-3 focus:border-[#1677ff] outline-0 hover:border-[#4096ff] focus:shadow-[0_0_0_2px_rgba(5,145,255,0.1)] h-8 border rounded-md"
      />
      {!toggle && (
        <Eye
          onClick={() => set_toggle(!toggle)}
          className="absolute top-1.5 right-3 z-10 w-5 h-5 fill-black fill-eye"
        />
      )}
      {toggle && (
        <EyeSlash
          onClick={() => set_toggle(!toggle)}
          className="absolute top-1.5 right-3 z-10 w-5 h-5 fill-black fill-eye"
        />
      )}
    </div>
  );
};
export default Component;
