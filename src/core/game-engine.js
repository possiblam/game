import { mountDayStage1 } from '../stages/daytime/stage-1.js';
import { mountDayStage2 } from '../stages/daytime/stage-2.js';
import { mountDayStage3 } from '../stages/daytime/stage-3.js';
import { mountDayStage4 } from '../stages/daytime/stage-4.js';
import { mountDayStage5 } from '../stages/daytime/stage-5.js';
import { mountDayStage6 } from '../stages/daytime/stage-6.js';

import { mountNightStage1 } from '../stages/nighttime/stage-1.js';
import { mountNightStage2 } from '../stages/nighttime/stage-2.js';
import { mountNightStage3 } from '../stages/nighttime/stage-3.js';
import { mountNightStage4 } from '../stages/nighttime/stage-4.js';
import { mountNightStage5 } from '../stages/nighttime/stage-5.js';
import { mountNightStage6 } from '../stages/nighttime/stage-6.js';

const STAGE_MOUNTERS = {
  'daytime-1': mountDayStage1,
  'daytime-2': mountDayStage2,
  'daytime-3': mountDayStage3,
  'daytime-4': mountDayStage4,
  'daytime-5': mountDayStage5,
  'daytime-6': mountDayStage6,
  'nighttime-1': mountNightStage1,
  'nighttime-2': mountNightStage2,
  'nighttime-3': mountNightStage3,
  'nighttime-4': mountNightStage4,
  'nighttime-5': mountNightStage5,
  'nighttime-6': mountNightStage6,
};

export function launchStageMiniGame(container, stageId, ctx) {
  const mounter = STAGE_MOUNTERS[stageId];
  if (!mounter) {
    throw new Error(`Stage mounter not found: ${stageId}`);
  }
  return mounter(container, ctx);
}
