// Ленивый chunk: driver.js + его CSS грузятся только при старте тура
// (dynamic import этого модуля из TourController).
import { driver, type Driver, type DriveStep, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'

export type { Driver, DriveStep, Side }

/** Инстанс с брендовой темой Plate. Колбэки шагов задаются в highlight(). */
export function createTourDriver(): Driver {
  return driver({
    animate: true,
    smoothScroll: true,
    allowClose: false,            // случайный клик по фону не закрывает тур
    allowKeyboardControl: false,
    overlayColor: '#14102a',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    disableActiveInteraction: false, // подсвеченная цель остаётся кликабельной
    popoverClass: 'plate-tour',
    showButtons: [],
  })
}
