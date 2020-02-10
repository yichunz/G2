import { each, isArray } from '@antv/util';
import { IGroup } from '../../../dependents';
import { Point, Position, RangePoint, ShapeInfo } from '../../../interface';
import { ShapeMarkerCfg } from '../interface';

import { registerShape, registerShapeFactory } from '../base';
import { getPathPoints } from '../util/get-path-points';
import { getStyle } from '../util/get-style';
import { getLinePath, getSplinePath } from '../util/path';
import { splitPoints } from '../util/split-points';
import { getLineMarker } from './util';

function getShapeAttrs(cfg: ShapeInfo, smooth?: boolean, constraint?: Position[]) {
  const { isStack, connectNulls, isInCircle } = cfg;
  const points = getPathPoints(cfg.points, connectNulls); // 根据 connectNulls 值处理 points

  let path = [];
  each(points, (eachLinePoints: Point[] | RangePoint[]) => {
    path = path.concat(getPath(eachLinePoints, isInCircle, isStack, smooth, constraint));
  });

  return {
    ...getStyle(cfg, true, false, 'lineWidth'),
    path,
  };
}

// 单条 path
function getSinglePath(points: Point[], isInCircle: boolean, smooth?: boolean, constraint?: Position[]) {
  let path;
  if (!smooth) {
    path = getLinePath(points, false);
    if (isInCircle) {
      path.push(['Z']);
    }
  } else {
    // 直角坐标系下绘制曲线时限制最大值、最小值
    if (isInCircle && points.length) {
      points.push({ x: points[0].x, y: points[0].y });
    }
    path = getSplinePath(points, false, constraint);
  }

  return path;
}

function getRangePath(
  points: RangePoint[],
  isInCircle: boolean,
  isStack?: boolean,
  smooth?: boolean,
  constraint?: Position[]
) {
  const topPoints = [];
  const bottomPoints = [];
  each(points, (point: RangePoint) => {
    const result = splitPoints(point);
    topPoints.push(result[1]); // 上边
    bottomPoints.push(result[0]); // 底边
  });

  const topPath = getSinglePath(topPoints, isInCircle, smooth, constraint);
  const bottomPath = getSinglePath(bottomPoints, isInCircle, smooth, constraint);
  if (isStack) {
    return topPath;
  }
  return topPath.concat(bottomPath);
}

function getPath(
  points: Point[] | RangePoint[],
  isInCircle: boolean,
  isStack?: boolean,
  smooth?: boolean,
  constraint?: Position[]
) {
  const first = points[0];

  return isArray(first.y)
    ? getRangePath(points as RangePoint[], isInCircle, isStack, smooth, constraint)
    : getSinglePath(points as Point[], isInCircle, smooth, constraint);
}

const LineShapeFactory = registerShapeFactory('line', {
  defaultShapeType: 'line',
});

// 这里因为代码公用，所以直接全部注册
// 'line' 默认折线；'dot' 点线 ···；'dash' 断线 - - -
each(['line', 'dot', 'dash', 'smooth'], (shapeType) => {
  registerShape('line', shapeType, {
    draw(cfg: ShapeInfo, container: IGroup) {
      const smooth = shapeType === 'smooth';
      let constraint;
      if (smooth) {
        const { start, end } = this.coordinate;
        constraint = [
          [start.x, end.y],
          [end.x, start.y],
        ];
      }

      const attrs = getShapeAttrs(cfg, smooth, constraint);
      const shape = container.addShape({
        type: 'path',
        attrs,
        name: 'line',
      });

      return shape;
    },
    getMarker(markerCfg: ShapeMarkerCfg) {
      return getLineMarker(markerCfg, shapeType);
    },
  });
});

export default LineShapeFactory;
