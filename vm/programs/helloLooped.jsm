// Hello world program, but using loops
// test of branching and alu operations
.def standard_settings $00F0
.def screen_address $8000

start:
mov !hello_world_string x
mov !screen_address y
mov !standard_settings [&y]


loop:
inc y
mov &x acc
mov acc [&y]

end:
hlt

// hello world string (null terminated)
.org $4000
.data16 hello_world_string { $0048 $0065 $006c $006c $006f $0020 $0057 $006f $0072 $006c $0064 $0021 $0000 }

// reset vector
.org $7ffe
.data16 reset_vector { !start }