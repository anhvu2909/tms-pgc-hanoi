import React, { useEffect, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import classNames from 'classnames';
import TweenOne from 'rc-tween-one';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { Arrow } from '@svgs';
import { uuidv4 } from '@utils';

export const Gantt = ({
  widthColumnDay = 36,
  perRow = 3,
  maxHeight = 500,
  data = [],
  event = [],
}: {
  widthColumnDay?: number;
  perRow?: number;
  maxHeight?: number;
  data: TTask[];
  event: {
    name: string;
    startDate: Dayjs;
    endDate?: Dayjs;
  }[];
}) => {
  const widthMonthYear = 110;
  const id = useRef('gantt-' + uuidv4());
  useEffect(() => {
    dayjs.locale('vi');
  }, []);

  const remainingMonths = (d: Dayjs, e: Dayjs) => {
    let date = d.subtract(perRow * 2, 'days');
    let end = e;
    const addDate = date.daysInMonth() - date.date() + 1;
    if (addDate * (widthColumnDay / perRow) < widthMonthYear)
      date = date.subtract(Math.ceil(widthMonthYear / widthColumnDay) * perRow - addDate, 'days');

    const addEndDate = end.date() + 1;
    if (addEndDate * (widthColumnDay / perRow) < widthMonthYear)
      end = end.add(Math.ceil(widthMonthYear / widthColumnDay) * perRow - addEndDate, 'days');

    setDateStart(date);
    const endMonth = end.month() - date.month() + 1 + (end.year() - date.year()) * 12;
    const objDate: any = {};
    let totalDay = date.date();
    let lengthDay = 0;
    for (let i = 0; i < endMonth; i++) {
      const currentDay = date.add(i, 'months');
      const month = currentDay.month();
      if (!objDate[currentDay.year()]) objDate[currentDay.year()] = {};
      if (!objDate[currentDay.year()][month]) objDate[currentDay.year()][month] = [];
      const dayInMonth = currentDay.daysInMonth();
      for (let j = totalDay; j <= dayInMonth; j += perRow) {
        if (j + perRow > dayInMonth) totalDay = j + perRow - dayInMonth;
        const nextDate = dayjs(
          currentDay.year() + '-' + (month < 10 ? '0' : '') + (month + 1) + '-' + (j < 10 ? '0' : '') + j,
        );
        if (nextDate < end.add(perRow, 'days')) objDate[currentDay.year()][month].push(nextDate);
      }
      lengthDay += objDate[currentDay.year()][month].length;
    }
    return { obj: objDate, total: lengthDay };
  };
  const [date, setDate] = useState<any>({ obj: {}, total: 0 });
  const [dateStart, setDateStart] = useState(dayjs());

  const getScrollBarWidth = () => {
    const el = document.createElement('div');
    el.style.cssText = 'overflow:scroll; visibility:hidden; position:absolute;';
    document.body.appendChild(el);
    const width = el.offsetWidth - el.clientWidth;
    el.remove();
    return width;
  };

  useEffect(() => {
    let start = dayjs();
    let end = dayjs().add(1, 'months');
    if (data.length && date.total === 0) {
      start = data[0].startDate;
      end = data[0].endDate || data[0].startDate.add(1, 'months');
      data.forEach((item) => {
        if (item.startDate < start) start = item.startDate;
        if (item.endDate && item.endDate > end) end = item.endDate;
      });
    }
    setDate(remainingMonths(start, end));
  }, [data]);

  useEffect(() => {
    if (date.total > 0) {
      (document.querySelector(`#${id.current} .left .head`) as any)!.style.width =
        document.querySelector(`#${id.current} .left .body`)!.clientWidth + getScrollBarWidth() + 'px';
      document.querySelectorAll(`#${id.current} .left tbody > tr:nth-of-type(1) > td`).forEach((e: any, index, arr) => {
        (document.querySelector(
          `#${id.current} .left thead > tr:nth-of-type(1) > th:nth-of-type(${index + 1})`,
        ) as any)!.style.width = e.clientWidth + (arr.length - 1 === index ? getScrollBarWidth() : 0) + 'px';
      });
      document
        .querySelectorAll(`#${id.current} .overflow-scroll`)
        .forEach((e: any) => (e.style.height = maxHeight + 'px'));
    }
  }, [date]);

  const loopGetDataset = (e: HTMLElement, key: string): HTMLElement => {
    if (e.parentElement && Object.prototype.hasOwnProperty.call(e.parentElement.dataset, key)) return e.parentElement;
    else if (e.parentElement) return loopGetDataset(e.parentElement, key);
    else return e;
  };
  const handleHover = (e: any) => {
    if (e.target) {
      const index = parseInt(loopGetDataset(e.target as HTMLElement, 'index').dataset.index!) + 1;
      ['left', 'right'].forEach((className) =>
        document
          .querySelector(`#${id.current} .${className} tbody > tr:nth-of-type(${index})`)
          ?.querySelectorAll('td')
          .forEach((td: HTMLTableCellElement) => td.classList.toggle('bg-blue-100')),
      );
    }
  };
  const statusCollapse = useRef<any>({});
  const [task, setTask] = useState(data);
  const handleCollapse = (index: number, level: number) => {
    statusCollapse.current[index] = !statusCollapse.current[index];

    let isCheck = true;
    let currentLevel: number | undefined;
    setTask(
      task.map((item, trIndex) => {
        if (isCheck && trIndex > index) {
          if (item.level > level) {
            if (currentLevel !== undefined && currentLevel === item.level && !statusCollapse.current[trIndex])
              currentLevel = undefined;
            else if (statusCollapse.current[trIndex] && currentLevel === undefined) currentLevel = item.level;
            item.hidden = statusCollapse.current[index] || (currentLevel !== undefined && currentLevel !== item.level);
          } else isCheck = false;
        }
        return item;
      }),
    );
  };

  const handleScroll = (e: any) => {
    (document.querySelector(`#${id.current} .event`) as any)!.style.top = e.target.scrollTop + 'px';
    ['left', 'right'].forEach((className) =>
      document.querySelector(`#${id.current} .${className} .overflow-scroll`)!.scrollTo({ top: e.target.scrollTop }),
    );
    if (e.target.dataset.scrollX)
      document.querySelector(`#${id.current} ${e.target.dataset.scrollX}`)!.scrollTo({ left: e.target.scrollLeft });
  };
  const NameColumn = ({ name }: { name: string; isDrag?: boolean }) => (
    <th align={'left'} className="capitalize border px-4 h-12 text-xs relative truncate">
      {name}
    </th>
  );
  const renderSvg = (item: TTask, i: number) => {
    if (item.success) {
      const endDate = item.endDate || item.startDate.add(i === 0 ? 0 : 1, 'day');
      const startTop = i * 24 + 4 + 8;
      const startLeft = (endDate.diff(dateStart, 'day') + perRow / 10) * (widthColumnDay / perRow);
      return item.success.split(',').map((id, index) => {
        const listData = task.filter((item) => !item.hidden && item.id === id);
        if (listData.length) {
          const data = listData[0];
          const endTop = task.filter((item) => !item.hidden).indexOf(data) * 24 + (data.endDate ? 4 : 7);
          const endLeft =
            (data.startDate.diff(dateStart, 'day') + (data.endDate ? 0 : 1) + perRow / 8) * (widthColumnDay / perRow) +
            (data.endDate ? 3 : data.startDate.diff(endDate) > 0 ? -9 : 3);
          return (
            <g key={i + '' + index}>
              <path
                d={
                  endDate.diff(data.startDate, 'day') > 1
                    ? `M ${startLeft - 1} ${startTop} L ${startLeft + widthColumnDay / perRow} ${startTop} L ${
                        startLeft + widthColumnDay / perRow
                      } ${startTop + 10} L ${endLeft} ${startTop + 10} L ${endLeft} ${endTop} `
                    : `M ${startLeft - 1} ${startTop} L ${endLeft} ${startTop} L ${endLeft} ${endTop}`
                }
                fill="transparent"
                stroke={!item.endDate ? 'black' : '#2563eb'}
                strokeWidth={1}
                aria-label={item.name}
                tabIndex={-1}
              ></path>
              <path
                d={`M ${endLeft + 4.2} ${endTop - 4.5} L ${endLeft - 4.5} ${endTop - 4.5} L ${endLeft + 0.2} ${endTop} Z`}
                aria-label={item.name}
                fill={!item.endDate ? 'black' : '#2563eb'}
              ></path>
            </g>
          );
        }
      });
    }
  };
  const indexTask = useRef(-1);
  const renderProgress = (item: TTask, index: number) => {
    if (index === 0) indexTask.current = -1;
    if (item.hidden) return;
    indexTask.current += 1;
    const startTop = indexTask.current * 24 + 4;
    const startLeft = item.startDate.diff(dateStart, 'day') * (widthColumnDay / perRow);
    if (item.endDate && item.percent) {
      return (
        <div
          key={index}
          className={'absolute'}
          style={{
            top: startTop + 'px',
            left: startLeft + 'px',
          }}
        >
          <div
            className={classNames('z-10 overflow-hidden', {
              'bg-gray-400': !!task[index + 1] && task[index + 1].level > item.level,
              'rounded-md bg-blue-400': !task[index + 1] || task[index + 1].level <= item.level,
            })}
            style={{
              width: (item.endDate.diff(item.startDate, 'day') + 1) * (widthColumnDay / perRow) + 'px',
            }}
          >
            <div
              className={classNames('text-center text-white text-xs h-4', {
                'bg-gray-600': !!task[index + 1] && task[index + 1].level > item.level,
                'bg-blue-600': !task[index + 1] || task[index + 1].level <= item.level,
              })}
              style={{ width: item.percent + '%' }}
            ></div>
          </div>
          {/*<div*/}
          {/*  className={'absolute top-0 text-xs text-gray-400'}*/}
          {/*  style={{*/}
          {/*    left: 5 + (item.endDate.diff(item.startDate, 'day') + 1) * (widthColumnDay / perRow) + 'px',*/}
          {/*  }}*/}
          {/*>*/}
          {/*  {item.percent}%*/}
          {/*</div>*/}
        </div>
      );
    }
    return (
      <div
        key={index}
        className={'absolute'}
        style={{
          top: startTop,
          left: startLeft + (item.endDate || index === 0 ? 0 : widthColumnDay / perRow) + 'px',
        }}
      >
        <div className={'absolute top-1 -left-1 z-10 h-3 w-3 bg-black rotate-45'}></div>
        {/*<div className="absolute -top-0.5 left-3 whitespace-nowrap">{item.name}</div>*/}
      </div>
    );
  };

  const widthGantt = (year: string, month: string) =>
    (dayjs()
      .year(parseInt(year))
      .month(parseInt(month))
      .endOf('month')
      .diff(date.obj[year][month][date.obj[year][month].length - 1], 'days') < perRow
      ? dayjs().year(parseInt(year)).month(parseInt(month)).endOf('month').diff(date.obj[year][month][0], 'days') >
        date.obj[year][month][0].daysInMonth() - (widthMonthYear / widthColumnDay) * perRow
        ? date.obj[year][month][0].daysInMonth()
        : dayjs().year(parseInt(year)).month(parseInt(month)).endOf('month').diff(date.obj[year][month][0], 'days') + 1
      : date.obj[year][month][date.obj[year][month].length - 1].diff(
          date.obj[year][month][0].startOf('month'),
          'days',
        ) + perRow) *
      (widthColumnDay / perRow) +
    'px';
  let wLeft = 0;
  let wRight = 0;
  let dragStart = true;
  let height = 0;
  return (
    <div id={id.current} className="relative">
      <div className="relative">
        <DndContext
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={() => (dragStart = true)}
          onDragMove={({ delta, active }) => {
            const left: any = document.querySelector(`#${id.current} .left`);
            const right: any = document.querySelector(`#${id.current} .right`);
            if (active.id === 'side') {
              if (dragStart) {
                dragStart = false;
                wLeft = parseFloat(left.clientWidth);
                wRight = parseFloat(right.clientWidth);
              }
              const p = delta.x;
              left.style.flexBasis = wLeft + p + 'px';
              right.style.flexBasis = wRight - p + 'px';
            }
          }}
        >
          <div className={'w-full flex gap-0.5'}>
            <div className={'left overflow-hidden'} style={{ flexBasis: '50%' }}>
              <div className={'left-scroll overflow-x-hidden'}>
                <table className={'head min-w-[600px]'}>
                  <thead>
                    <tr>
                      <NameColumn name={'Product Release'}></NameColumn>
                      <NameColumn name={'Assignee'}></NameColumn>
                      <NameColumn name={'Status'}></NameColumn>
                      <NameColumn name={'Priority'}></NameColumn>
                      <NameColumn name={'Planned'}></NameColumn>
                      <NameColumn name={'Work Log'} isDrag={false}></NameColumn>
                    </tr>
                  </thead>
                </table>
              </div>

              <div className="overflow-scroll" data-scroll-x={'.left-scroll'} onScroll={handleScroll}>
                <table className={'body min-w-[600px] border-b'}>
                  <tbody>
                    {task.map(
                      (item, index) =>
                        !item.hidden && (
                          <tr
                            key={index}
                            onMouseOver={handleHover}
                            onMouseOut={handleHover}
                            data-index={index}
                            data-level={item.level}
                          >
                            <td className="border-x pl-5 py-0 h-6 overflow-hidden">
                              <div
                                className={'flex items-center gap-1'}
                                style={{ paddingLeft: item.level * (widthColumnDay / perRow) + 'px' }}
                              >
                                {!!task[index + 1] && task[index + 1].level > item.level && (
                                  <TweenOne
                                    animation={{ rotate: 0, duration: 200 }} // @ts-ignore
                                    moment={!statusCollapse.current[index] ? null : 1}
                                    reverse={!statusCollapse.current[index]}
                                    className={'-ml-4 rotate-90 w-3 h-3 cursor-pointer'}
                                  >
                                    <Arrow onClick={() => handleCollapse(index, item.level)} className={'w-3 h-3'} />
                                  </TweenOne>
                                )}
                                <span className={'truncate'}>{item.name}</span>
                              </div>
                            </td>
                            <td className="border-x px-4 py-0 h-6 truncate">{item.assignee}</td>
                            <td
                              className={classNames('border-x px-4 py-0 h-6 text-white truncate', {
                                'bg-blue-600': item.status === 'In Progress',
                                'bg-green-600': item.status === 'Completed',
                                'bg-gray-600': item.status === 'On Hold',
                              })}
                            >
                              {item.status}
                            </td>
                            <td
                              className={classNames('border-x px-4 py-0 h-6 text-white truncate', {
                                'bg-red-500': item.priority === 'Critical',
                                'bg-orange-500': item.priority === 'High',
                                'bg-yellow-500': item.priority === 'Normal',
                              })}
                            >
                              {item.priority}
                            </td>
                            <td className="border-x px-4 py-0 h-6 truncate">
                              {item.planned} {item.planned ? 'hours' : ''}
                            </td>
                            <td className="border-x px-4 py-0 h-6 truncate">
                              {item.work} {item.work ? 'days' : ''}
                            </td>
                          </tr>
                        ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <DraggableSide />
            <div className={'right relative overflow-hidden'} style={{ flexBasis: '50%' }}>
              <div className={'right-scroll overflow-x-hidden'} style={{ paddingRight: getScrollBarWidth() + 'px' }}>
                <table
                  className={'w-full min-w-[600px] border-b'}
                  style={{ width: date.total * widthColumnDay + 'px' }}
                >
                  <thead>
                    <tr>
                      {Object.keys(date.obj).map((year) =>
                        Object.keys(date.obj[year]).map((month, index) => (
                          <th
                            key={index}
                            align={'left'}
                            className={'capitalize border-l border-r border-t px-4 h-6 text-xs'}
                            style={{ width: widthGantt(year, month) }}
                          >
                            {date.obj[year][month][0].format('MMMM')} {year}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                </table>
                <table
                  className={'w-full min-w-[600px] border-b'}
                  style={{ width: date.total * widthColumnDay + 'px' }}
                >
                  <thead>
                    <tr>
                      {Object.keys(date.obj).map((year) =>
                        Object.keys(date.obj[year]).map((month) =>
                          date.obj[year][month].map((day: Dayjs, index: number) => (
                            <th
                              key={index}
                              className={'capitalize border-x font-normal h-6 text-xs'}
                              style={{ width: widthColumnDay + 'px' }}
                            >
                              {day.format('DD')}
                            </th>
                          )),
                        ),
                      )}
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="overflow-scroll relative" data-scroll-x={'.right-scroll'} onScroll={handleScroll}>
                <div
                  className="event h-full absolute top-0 left-0 flex z-10"
                  style={{ width: date.total * widthColumnDay + 'px' }}
                >
                  {event.map((item, index) => {
                    if (item.endDate)
                      return (
                        <div
                          key={index}
                          className={'bg-gray-200 h-full absolute flex items-center justify-center text-gray-400'}
                          style={{
                            width: (item.endDate.diff(item.startDate, 'day') + 1) * (widthColumnDay / perRow) + 'px',
                            left: item.startDate.diff(dateStart, 'day') * (widthColumnDay / perRow) + 'px',
                          }}
                        >
                          <div
                            className="rotate-90 whitespace-nowrap text-center"
                            style={{ marginTop: -item.name.length * 6 + 'px' }}
                          >
                            {item.name}
                          </div>
                        </div>
                      );
                    else
                      return (
                        <div
                          key={index}
                          className={
                            'border-red-600 border-l border-dashed h-full absolute flex justify-center items-center'
                          }
                          style={{
                            left: item.startDate.diff(dateStart, 'day') * (widthColumnDay / perRow) + 'px',
                          }}
                        >
                          <div className="px-2 py-1 bg-red-500 text-white rounded-r-xl">{item.name}</div>
                        </div>
                      );
                  })}
                </div>
                <svg
                  className={'absolute top-0 left-0 z-10'}
                  style={{
                    width: date.total * widthColumnDay + 'px',
                    height: task.filter((item) => !item.hidden).length * 24 + 'px',
                  }}
                >
                  {task.filter((item) => !item.hidden).map((item, i) => renderSvg(item, i))}
                </svg>
                <div
                  className="task absolute top-0 left-0 flex z-10"
                  style={{ width: date.total * widthColumnDay + 'px' }}
                >
                  {task.map((item, index) => renderProgress(item, index))}
                </div>
                <table className={'min-w-[600px] border-b -z-10'} style={{ width: date.total * widthColumnDay + 'px' }}>
                  <tbody>
                    {task.map((item, index) => (
                      <tr
                        key={index}
                        onMouseOver={handleHover}
                        onMouseOut={handleHover}
                        data-index={index}
                        data-level={item.level}
                      >
                        {Object.keys(date.obj).map((year) =>
                          Object.keys(date.obj[year]).map((month) =>
                            date.obj[year][month].map((day: Dayjs, i: number) => (
                              <td key={i} className={'capitalize border-x font-normal h-6 relative py-0'} />
                            )),
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DndContext>
      </div>
      <DndContext
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={() => (dragStart = true)}
        onDragMove={({ delta, active }) => {
          if (active.id === 'vertical') {
            const vertical = document.querySelectorAll(`#${id.current} .overflow-scroll`);
            if (dragStart) {
              dragStart = false;
              height = vertical[0].clientHeight;
            }
            vertical.forEach((e: any) => (e.style.height = height + delta.y + 'px'));
          }
        }}
      >
        <DraggableVertical />
      </DndContext>
    </div>
  );
};
const DraggableSide = () => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: 'side' });
  return (
    <div className={'w-1 h-auto cursor-ew-resize hover:bg-red-500'} ref={setNodeRef} {...listeners} {...attributes} />
  );
};
const DraggableVertical = () => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: 'vertical' });
  return (
    <div className={'w-full h-1 cursor-ns-resize hover:bg-red-500'} ref={setNodeRef} {...listeners} {...attributes} />
  );
};
type TTask = {
  id: string;
  name: string;
  assignee?: string;
  status?: string;
  priority?: string;
  planned?: number;
  work?: number;
  startDate: Dayjs;
  endDate?: Dayjs;
  percent?: number;
  level: number;
  success?: string;
  hidden?: boolean;
};
