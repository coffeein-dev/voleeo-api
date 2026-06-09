#![allow(deprecated)]
use cocoa::base::{id, BOOL};
use cocoa::foundation::NSUInteger;
use objc::runtime::{Object, Sel};
use objc::{msg_send, sel, sel_impl};
use std::ffi::c_void;
use tauri::{Emitter, Runtime, Window};

struct UnsafeWindowHandle(*mut std::ffi::c_void);
unsafe impl Send for UnsafeWindowHandle {}
unsafe impl Sync for UnsafeWindowHandle {}

const WINDOW_CONTROL_PAD_X: f64 = 13.0;
const WINDOW_CONTROL_PAD_Y: f64 = 13.0;
const TITLEBAR_EXTRA_HEIGHT: f64 = 4.0;
// NSWindowStyleMask::NSFullSizeContentViewWindowMask
const NS_FULL_SIZE_CONTENT_VIEW_WINDOW_MASK: u64 = 1 << 15;
// NSWindowTitleVisibility::NSWindowTitleHidden
const NS_WINDOW_TITLE_HIDDEN: i64 = 1;

#[derive(Debug)]
struct WindowState<R: Runtime> {
    window: Window<R>,
}

fn setup_overlay_titlebar(ns_window: cocoa::base::id) {
    use cocoa::appkit::NSWindow;
    use cocoa::base::YES;
    unsafe {
        ns_window.setTitlebarAppearsTransparent_(YES);
        let _: () = msg_send![ns_window, setTitleVisibility: NS_WINDOW_TITLE_HIDDEN];
        let style: u64 = msg_send![ns_window, styleMask];
        let _: () =
            msg_send![ns_window, setStyleMask: style | NS_FULL_SIZE_CONTENT_VIEW_WINDOW_MASK];
    }
}

fn position_traffic_lights(ns_window_handle: UnsafeWindowHandle, x: f64, y: f64) {
    use cocoa::appkit::{NSView, NSWindow, NSWindowButton};
    use cocoa::foundation::NSRect;

    let ns_window = ns_window_handle.0 as cocoa::base::id;
    unsafe {
        let close = ns_window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
        let miniaturize =
            ns_window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
        let zoom = ns_window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

        let close_rect: NSRect = msg_send![close, frame];
        let button_height = close_rect.size.height;

        let title_bar_container_view = close.superview().superview();

        use std::sync::OnceLock;
        static DEFAULT_TITLEBAR_HEIGHT: OnceLock<f64> = OnceLock::new();
        let default_height = *DEFAULT_TITLEBAR_HEIGHT
            .get_or_init(|| NSView::frame(title_bar_container_view).size.height);

        let desired = button_height + y;
        let title_bar_frame_height = if desired > default_height {
            desired
        } else {
            default_height + TITLEBAR_EXTRA_HEIGHT
        };

        let mut title_bar_rect = NSView::frame(title_bar_container_view);
        title_bar_rect.size.height = title_bar_frame_height;
        title_bar_rect.origin.y = NSView::frame(ns_window).size.height - title_bar_frame_height;
        let _: () = msg_send![title_bar_container_view, setFrame: title_bar_rect];

        let space_between = NSView::frame(miniaturize).origin.x - NSView::frame(close).origin.x;

        for (i, button) in [close, miniaturize, zoom].into_iter().enumerate() {
            let mut rect: NSRect = NSView::frame(button);
            rect.origin.x = x + (i as f64 * space_between);
            button.setFrameOrigin(rect.origin);
        }
    }
}

fn with_window_state<R: Runtime, F: FnOnce(&mut WindowState<R>) -> T, T>(this: &Object, func: F) {
    let ptr = unsafe {
        let x: *mut c_void = *this.get_ivar("app_box");
        &mut *(x as *mut WindowState<R>)
    };
    func(ptr);
}

extern "C" fn on_window_should_close(this: &Object, _cmd: Sel, sender: id) -> BOOL {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        msg_send![super_del, windowShouldClose: sender]
    }
}
extern "C" fn on_window_will_close(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowWillClose: notification];
    }
}
extern "C" fn on_window_did_resize<R: Runtime>(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        with_window_state(&*this, |state: &mut WindowState<R>| {
            let id = state.window.ns_window().expect("Failed to get ns_window") as id;
            position_traffic_lights(
                UnsafeWindowHandle(id as *mut c_void),
                WINDOW_CONTROL_PAD_X,
                WINDOW_CONTROL_PAD_Y,
            );
        });
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidResize: notification];
    }
}
extern "C" fn on_window_did_move(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidMove: notification];
    }
}
extern "C" fn on_window_did_change_backing_properties(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidChangeBackingProperties: notification];
    }
}
extern "C" fn on_window_did_become_key(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidBecomeKey: notification];
    }
}
extern "C" fn on_window_did_resign_key(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidResignKey: notification];
    }
}

extern "C" fn on_dragging_entered(this: &Object, _cmd: Sel, notification: id) -> BOOL {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        msg_send![super_del, draggingEntered: notification]
    }
}
extern "C" fn on_prepare_for_drag_operation(this: &Object, _cmd: Sel, notification: id) -> BOOL {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        msg_send![super_del, prepareForDragOperation: notification]
    }
}
extern "C" fn on_perform_drag_operation(this: &Object, _cmd: Sel, sender: id) -> BOOL {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        msg_send![super_del, performDragOperation: sender]
    }
}
extern "C" fn on_conclude_drag_operation(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, concludeDragOperation: notification];
    }
}
extern "C" fn on_dragging_exited(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, draggingExited: notification];
    }
}

extern "C" fn on_window_will_use_full_screen_presentation_options(
    this: &Object,
    _cmd: Sel,
    window: id,
    proposed_options: NSUInteger,
) -> NSUInteger {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        msg_send![super_del, window: window willUseFullScreenPresentationOptions: proposed_options]
    }
}
extern "C" fn on_window_did_enter_full_screen<R: Runtime>(
    this: &Object,
    _cmd: Sel,
    notification: id,
) {
    unsafe {
        with_window_state(&*this, |state: &mut WindowState<R>| {
            state
                .window
                .emit("did-enter-fullscreen", ())
                .expect("Failed to emit event");
        });
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidEnterFullScreen: notification];
    }
}
extern "C" fn on_window_will_enter_full_screen<R: Runtime>(
    this: &Object,
    _cmd: Sel,
    notification: id,
) {
    unsafe {
        with_window_state(&*this, |state: &mut WindowState<R>| {
            state
                .window
                .emit("will-enter-fullscreen", ())
                .expect("Failed to emit event");
        });
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowWillEnterFullScreen: notification];
    }
}
extern "C" fn on_window_did_exit_full_screen<R: Runtime>(
    this: &Object,
    _cmd: Sel,
    notification: id,
) {
    unsafe {
        with_window_state(&*this, |state: &mut WindowState<R>| {
            state
                .window
                .emit("did-exit-fullscreen", ())
                .expect("Failed to emit event");
            let id = state.window.ns_window().expect("Failed to get ns_window") as id;
            position_traffic_lights(
                UnsafeWindowHandle(id as *mut c_void),
                WINDOW_CONTROL_PAD_X,
                WINDOW_CONTROL_PAD_Y,
            );
        });
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidExitFullScreen: notification];
    }
}
extern "C" fn on_window_will_exit_full_screen<R: Runtime>(
    this: &Object,
    _cmd: Sel,
    notification: id,
) {
    unsafe {
        with_window_state(&*this, |state: &mut WindowState<R>| {
            state
                .window
                .emit("will-exit-fullscreen", ())
                .expect("Failed to emit event");
        });
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowWillExitFullScreen: notification];
    }
}
extern "C" fn on_window_did_fail_to_enter_full_screen(this: &Object, _cmd: Sel, window: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, windowDidFailToEnterFullScreen: window];
    }
}

extern "C" fn on_effective_appearance_did_change(this: &Object, _cmd: Sel, notification: id) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![super_del, effectiveAppearanceDidChange: notification];
    }
}
extern "C" fn on_effective_appearance_did_changed_on_main_thread(
    this: &Object,
    _cmd: Sel,
    notification: id,
) {
    unsafe {
        let super_del: id = *this.get_ivar("super_delegate");
        let _: () = msg_send![
            super_del,
            effectiveAppearanceDidChangedOnMainThread: notification
        ];
    }
}

pub fn setup_traffic_light_positioner<R: Runtime>(window: &Window<R>) {
    use cocoa::appkit::NSWindow;
    use cocoa::delegate;
    use rand::distr::Alphanumeric;
    use rand::Rng;

    let ns_win_ptr = window.ns_window().expect("Failed to get ns_window");
    setup_overlay_titlebar(ns_win_ptr as cocoa::base::id);
    position_traffic_lights(
        UnsafeWindowHandle(ns_win_ptr),
        WINDOW_CONTROL_PAD_X,
        WINDOW_CONTROL_PAD_Y,
    );

    unsafe {
        let ns_win = window.ns_window().expect("Failed to get ns_window") as id;
        let current_delegate: id = ns_win.delegate();

        let app_state = WindowState {
            window: window.clone(),
        };
        let app_box = Box::into_raw(Box::new(app_state)) as *mut c_void;
        let random_str: String = rand::rng()
            .sample_iter(&Alphanumeric)
            .take(20)
            .map(char::from)
            .collect();
        let delegate_name = format!("windowDelegate_{}_{}", window.label(), random_str);

        ns_win.setDelegate_(delegate!(&delegate_name, {
            window: id = ns_win,
            app_box: *mut c_void = app_box,
            toolbar: id = cocoa::base::nil,
            super_delegate: id = current_delegate,
            (windowShouldClose:) => on_window_should_close as extern "C" fn(&Object, Sel, id) -> BOOL,
            (windowWillClose:) => on_window_will_close as extern "C" fn(&Object, Sel, id),
            (windowDidResize:) => on_window_did_resize::<R> as extern "C" fn(&Object, Sel, id),
            (windowDidMove:) => on_window_did_move as extern "C" fn(&Object, Sel, id),
            (windowDidChangeBackingProperties:) => on_window_did_change_backing_properties as extern "C" fn(&Object, Sel, id),
            (windowDidBecomeKey:) => on_window_did_become_key as extern "C" fn(&Object, Sel, id),
            (windowDidResignKey:) => on_window_did_resign_key as extern "C" fn(&Object, Sel, id),
            (draggingEntered:) => on_dragging_entered as extern "C" fn(&Object, Sel, id) -> BOOL,
            (prepareForDragOperation:) => on_prepare_for_drag_operation as extern "C" fn(&Object, Sel, id) -> BOOL,
            (performDragOperation:) => on_perform_drag_operation as extern "C" fn(&Object, Sel, id) -> BOOL,
            (concludeDragOperation:) => on_conclude_drag_operation as extern "C" fn(&Object, Sel, id),
            (draggingExited:) => on_dragging_exited as extern "C" fn(&Object, Sel, id),
            (window:willUseFullScreenPresentationOptions:) => on_window_will_use_full_screen_presentation_options as extern "C" fn(&Object, Sel, id, NSUInteger) -> NSUInteger,
            (windowDidEnterFullScreen:) => on_window_did_enter_full_screen::<R> as extern "C" fn(&Object, Sel, id),
            (windowWillEnterFullScreen:) => on_window_will_enter_full_screen::<R> as extern "C" fn(&Object, Sel, id),
            (windowDidExitFullScreen:) => on_window_did_exit_full_screen::<R> as extern "C" fn(&Object, Sel, id),
            (windowWillExitFullScreen:) => on_window_will_exit_full_screen::<R> as extern "C" fn(&Object, Sel, id),
            (windowDidFailToEnterFullScreen:) => on_window_did_fail_to_enter_full_screen as extern "C" fn(&Object, Sel, id),
            (effectiveAppearanceDidChange:) => on_effective_appearance_did_change as extern "C" fn(&Object, Sel, id),
            (effectiveAppearanceDidChangedOnMainThread:) => on_effective_appearance_did_changed_on_main_thread as extern "C" fn(&Object, Sel, id)
        }));
    }
}
