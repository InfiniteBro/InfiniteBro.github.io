.data16 start { !reset_vector }
//                      it's too late in development to comment this. I'm sorry.
_function-setup:
mov $fff, CLK
mov !_function-key_typed, [!_hardware-interrupt_vector-keyboard]
mov $1, IM
mov !text_field, [!cursor_pos]
mov $20, [!text_field]
mov 0, [!text_field + $02]
mov $02, [!text_length]
mov !cursor_blink_time, [!cursor_character_status]
jmp [!_function-loop]


.def frame_sleep $05
.def cursor_blink_time $08
.def cursor_character_template $25ae

.data16 cursor_character { !cursor_character_template }
.data16 cursor_character_status { $0000 }


_function-loop:
mov !font-reset, [!_memory_map-screen_address]
mov !font-green, [!_memory_map-screen_address]
mov !text_field, x
mov (!_memory_map-screen_address + $01), y
cal &NUL, [!_function-display_text_to_screen]

_function-loop-sleep:
mov [!_memory_map-sleep_timer], acc
jlt !frame_sleep, [!_function-loop-sleep]
mov 0, [!_memory_map-sleep_timer]

mov [!cursor_character_status], acc
dec acc
mov acc, [!cursor_character_status]
jgz [!_function-loop]

mov !cursor_blink_time, [!cursor_character_status]
mov [!cursor_character], acc
sub !cursor_character_template, acc
mov acc, [!cursor_character]
jmp [!_function-loop]




.def chars_per_row $4e

_function-display_text_to_screen:
mov &FP, d

_function-display_text_to_screen-find_target_pos:
mul d, !chars_per_row
add acc, y
mov acc, y

_function-display_text_to_screen-loop:
mov [!cursor_pos], acc
jeq x, [!_function-display_text_to_screen-draw_cursor]

_function-display_text_to_screen-cursor_skip:
mov &x, acc
jez [!_function-display_text_to_screen-done]
jeq !key-newline, [!_function-display_text_to_screen-increment_pointers]
mov acc, &y

_function-display_text_to_screen-increment_pointers:
mov &x, acc
inc x
inc x
jeq !key-newline, [!_function-display_text_to_screen-new_line]
inc y
jmp [!_function-display_text_to_screen-loop]

_function-display_text_to_screen-new_line:
mov (!_memory_map-screen_address + $01), y
inc d
jmp [!_function-display_text_to_screen-find_target_pos]

_function-display_text_to_screen-draw_cursor:
mov [!cursor_character], acc
jez [!_function-display_text_to_screen-cursor_skip]
mov acc, &y
mov &x, acc
jnz [!_function-display_text_to_screen-increment_pointers]

_function-display_text_to_screen-done:
rts

// important keys
.def key-backspace $08
.def key-newline $0a
.def key-up_arrow $e000
.def key-right_arrow $e001
.def key-down_arrow $e002
.def key-left_arrow $e003
.def key-insert $e004
.def key-escape $001b

_function-key_typed:
mov [!cursor_pos], x
mov [!_memory_map-keyboard], d

sub !key-escape, d
jez [!_function-escape_key_pressed]

sub !key-backspace, d
jnz [!_function-key_typed-is_insert]
sub x, (!cursor_pos + $02)
jez [!_function-key_typed-rti]
cal &x, [!_function-delete_char_and_shift]
rti

_function-key_typed-is_insert:
sub !key-insert, d
jnz [!_function-key_typed-is_left_arrow]
cal &x, [!_function-insert_space_and_unshift]
rti

_function-key_typed-is_left_arrow:
sub !key-left_arrow, d
jnz [!_function-key_typed-is_up_arrow]
sub x, (!cursor_pos + $02)
jez [!_function-key_typed-rti]
dec x
dec x
jmp [!_function-key_typed-end]

_function-key_typed-is_up_arrow:
sub !key-up_arrow, d
jnz [!_function-key_typed-is_right_arrow]
cal &NUL, [!_function-find_previous_newline]
mov &FP, x
jmp [!_function-key_typed-end]

_function-key_typed-is_right_arrow:
sub d, !key-right_arrow
jnz [!_function-key_typed-is_down_arrow]
mov &x, acc
jez [!_function-key_typed-rti]
inc x
inc x
mul d, !chars_per_row
jgt acc, [!_function-key_typed-end]
inc d
jmp [!_function-key_typed-end]

_function-key_typed-is_down_arrow:
sub !key-down_arrow, d
jnz [!_function-key_typed-no_special_keys]
cal &NUL, [!_function-find_next_newline]
mov &FP, x
jmp [!_function-key_typed-end]

_function-key_typed-no_special_keys:
mov d, &x
inc x
inc x
cal &NUL, [!_function-increment_text_length]

_function-key_typed-end:
mov x, [!cursor_pos]

_function-key_typed-rti:
rti

_function-escape_key_pressed:
cal &NUL, [!_function-save_text]
bki [!_function-break]

_function-break:
mov 0, IM
mov (!_memory_map-hard_drive + $01), x
mov 0, y
mov 0, mar
mov !_program-JSDOS-skip_splash_screen, d
cal &mar, [!_program-bootloader-function-load_program_and_jump]
hlt

.data16 save_data_location { $ffff, $c001 }

_function-save_text:
mov [!save_data_location], mar
mov mar, [!_memory_map-hard_drive]
mov !text_length, x
mov [!save_data_location + $02], y
mov [!text_length], acc
cal &acc, [!_function-mov_data]
rts




// helper functions
_function-increment_text_length:
mov [!text_length], acc
add acc, $02
mov acc, [!text_length]
rts

_function-decrement_text_length:
mov [!text_length], acc
sub acc, $02
mov acc, [!text_length]
rts

_function-delete_char_and_shift:
mov &FP, x
add x, $02
mov x, y

_function-delete_char_and_shift-loop:
mov &y, acc
mov acc, &x
jez [!function-delete_char_and_shift-end]
mov y, x
inc y
inc y
jmp [!_function-delete_char_and_shift-loop]
function-delete_char_and_shift-end:
cal &NUL, [!_function-decrement_text_length]
rts

_function-insert_space_and_unshift:
mov &FP, x
mov $20, d

_function-insert_space_and_unshift-loop:
mov &x, acc
mov d, &x
inc x
inc x
jez [!function-insert_space_and_unshift-end]
mov acc, d
jmp [!_function-insert_space_and_unshift-loop]
function-insert_space_and_unshift-end:
mov 0, &x
cal &NUL, [!_function-increment_text_length]
rts

_function-find_previous_newline:
mov x, acc
jeq (!cursor_pos + $02), [!_function-find_previous_newline-end]
dec x
dec x
mov &x, acc
jne !key-newline, [!_function-find_previous_newline]

_function-find_previous_newline-end:
mov x, &FP
rts

_function-find_next_newline:
mov &x, acc
jez [!_function-find_next_newline-end]
inc x
inc x
mov &x, acc
jne !key-newline, [!_function-find_next_newline]

_function-find_next_newline-end:
mov x, &FP
rts

.data16 reset_vector { !_function-setup }

.data16 cursor_pos { $0000 }
.data16 text_length { $0000 }
.data16 text_field { $0000 }