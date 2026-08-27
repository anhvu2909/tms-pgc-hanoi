import { Card, Empty, Tooltip } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { DonHang } from 'src/store/don-hang';
import { DashboardFacade } from 'src/store/dashboard';
import { PhuongTienModel } from 'src/store/quan-ly-phuong-tien';
import { LaiXeModel } from 'src/store/quan-ly-lai-xe';
import { EyeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { lang, routerLinks } from '@utils';

/**
 * Sinh màu theo chuỗi, cho phép dao động S & L trong biên độ nhỏ.
 *
 * @param str        Chuỗi nguồn
 * @param satBase    Saturation trung tâm (%). Mặc định 60
 * @param satDelta   Biên độ ± cho Saturation (%). Mặc định 10  → 50–70 %
 * @param lightBase  Lightness trung tâm (%). Mặc định 85
 * @param lightDelta Biên độ ± cho Lightness (%). Mặc định 5   → 80–90 %
 */
export function stringToColor(str: string, satBase = 75, satDelta = 10, lightBase = 75, lightDelta = 5): string {
  /** 1) Tạo hash nguyên */
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  /** 2) Hue cố định từ hash */
  const hue = Math.abs(hash) % 360;

  /** 3) Lấy thêm bit hash để "lắc" S & L */
  const satVar = ((hash >> 8) & 0xff) / 0xff; // 0–1
  const lightVar = ((hash >> 16) & 0xff) / 0xff; // 0–1

  const saturation = clamp(satBase - satDelta + satVar * satDelta * 2, 0, 100);
  const lightness = clamp(lightBase - lightDelta + lightVar * lightDelta * 2, 0, 100);

  return hslToHex(hue, saturation, lightness);
}

/** HSL → #RRGGBB  */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));

  const toHex = (x: number) => x.toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const hours = Array(25)
  .fill(undefined)
  .map((_, i) => i);

const DashboardGanttChart: React.FC = () => {
  const dashboardFacade = DashboardFacade();
  const ganttContainer = useRef<HTMLDivElement>(null);
  const timeIndicator = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const lastMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cellWidth, setCellWidth] = useState(56);
  const refCellWidth = useRef(cellWidth);
  const chartData = useMemo(() => {
    const phuongTienMap: Record<
      string,
      {
        laiXe: LaiXeModel;
        phuongTien: PhuongTienModel;
        color: string;
        requests: { col: number; data: DonHang }[];
      }
    > = {};

    dashboardFacade.ordersInTransitToday?.forEach((item) => {
      if (!phuongTienMap[item.phuongTien!.id!]) {
        phuongTienMap[item.phuongTien!.id!] = {
          laiXe: item.laiXe!,
          phuongTien: item.phuongTien!,
          color: stringToColor(item.phuongTien?.id ?? ''),
          requests: [],
        };
      }

      const hour = dayjs(item.thoiHanGiaoHang).hour();

      phuongTienMap[item.phuongTien!.id!].requests.push({
        col: hour,
        data: item,
      });
    });

    return Object.values(phuongTienMap);
  }, [dashboardFacade.ordersInTransitToday]);
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    document.body.style.userSelect = 'none';
  }, []);
  const setIndicatorPosition = (currentTime: dayjs.Dayjs) => {
    if (timeIndicator.current) {
      const left = Math.round(
        4 * 32 +
          refCellWidth.current / 2 +
          (currentTime.diff(currentTime.startOf('day'), 'minute') * refCellWidth.current) / 60,
      );
      timeIndicator.current.style.left = `${left}px`;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setIndicatorPosition(dayjs()), 5000);
    setIndicatorPosition(dayjs());

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current && ganttContainer.current) {
        const deltaX = e.clientX - lastMousePosition.current.x;
        ganttContainer.current.scrollLeft -= deltaX;

        const deltaY = e.clientY - lastMousePosition.current.y;
        ganttContainer.current.scrollTop -= deltaY;

        lastMousePosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = '';
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setCellWidth((prevWidth) => {
          const newWidth = prevWidth - e.deltaY / 25;
          refCellWidth.current = Math.max(32, Math.min(120, newWidth));

          return refCellWidth.current;
        });
        setTimeout(() => {
          setIndicatorPosition(dayjs());
        }, 0);
      }
    };

    const container = ganttContainer.current!;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <Card styles={{ body: { padding: 16, height: 340 } }}>
      <div className="h-full flex flex-col">
        <p className="text-gray-900 text-center text-base font-bold mb-2">Danh sách đơn hàng cần giao</p>
        <div
          ref={ganttContainer}
          style={{ overflow: chartData.length ? 'auto' : 'hidden' }}
          className="miniScroll relative flex-1"
        >
          {!chartData.length && (
            <div className="flex-1 flex items-center justify-center absolute top-11 left-0 right-0 bottom-0 bg-white z-[5]">
              <Empty description="Không có đơn hàng cần giao" />
            </div>
          )}
          <div className="size-fit min-h-full relative">
            <div
              style={{
                gridTemplateColumns: `auto ${cellWidth / 2}px repeat(${hours.length - 1}, ${cellWidth}px) ${cellWidth / 2}px`,
              }}
              className="absolute top-0 left-0 grid size-full z-[1] pt-10 *:h-full"
            >
              <div className="bg-white w-32 sticky left-0 z-[2]"></div>
              <div style={{ left: 128 - cellWidth / 2 + 1 }} className="border-r sticky"></div>
              {Array(hours.length - 1)
                .fill(undefined)
                .map((_, i) => (
                  <div key={i} className="border-r"></div>
                ))}
            </div>
            <div
              style={{ gridTemplateColumns: `auto repeat(${hours.length}, ${cellWidth}px)` }}
              className="grid z-[4] sticky top-0 bg-white border-b-4 border-neutral-300 *:text-center *:font-medium"
            >
              <div className="w-32 sticky left-0 bg-slate-100 leading-10">Xe/Giờ</div>
              {hours.map((hour) => (
                <div key={hour} className="h-10 flex items-center justify-center pt-1 bg-slate-100">
                  <div className="border-black/20 text-sm font-medium">{hour}H</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 mt-2 relative">
              {chartData.map((phuongTien, i) => (
                <div
                  key={i}
                  style={{
                    gridTemplateColumns: `auto ${cellWidth / 2}px repeat(${hours.length - 1}, ${cellWidth}px) ${cellWidth / 2}px`,
                  }}
                  className="grid h-12 *:h-full relative"
                >
                  <div
                    style={{ paddingLeft: cellWidth / 2, right: cellWidth / 2 }}
                    className="h-full absolute top-0 left-32"
                  >
                    <div className="size-full bg-gray-100/80"></div>
                  </div>
                  <div className="w-32 sticky left-0 px-4 flex flex-col items-center justify-center bg-white z-[3]">
                    <span className="font-medium">{phuongTien.phuongTien.bienSoXe}</span>
                    <span className="text-black/50 text-xs font-medium">({phuongTien.laiXe.tenTaiXe})</span>
                  </div>
                  {phuongTien.requests.map((request, i) => (
                    <Tooltip key={i} title={`Đơn hàng giao đến ${request.data.diaChiBenNhan}`}>
                      <div
                        style={{
                          gridColumnStart: request.col + 3,
                          backgroundColor: phuongTien.color,
                        }}
                        className="relative rounded-md z-[2] opacity-100 hover:opacity-80 transition-opacity group"
                      >
                        <Link
                          to={`/${lang}${routerLinks('DonHang')}?orderId=${request.data.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white absolute top-0.5 right-1 leading-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <EyeOutlined />
                        </Link>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
            <div onMouseDown={handleMouseDown} className="z-[1] absolute top-0 left-32 right-0 bottom-0"></div>
            <div
              ref={timeIndicator}
              className="border-r border-orange-500 absolute top-0 left-32 bottom-0 pointer-events-none z-[4]"
            >
              <div className="absolute border-8 border-transparent border-t-orange-500 top-0 left-0 -translate-x-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardGanttChart;
