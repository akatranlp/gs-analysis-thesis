import "strings"

data = from(bucket: "gs3")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "onlineInactiveStatus")
  |> filter(fn: (r) => r["_field"] == "value")
  |> filter(fn: (r) => r.name != "tf2-Inactive" and r.name != "tf2-Online" and r.name != "mc-vanilla2-Inactive" and r.name != "mc-vanilla2-Online")
  |> drop(columns: ["_start", "_stop", "_measurement", "_field"])

playerCount = from(bucket: "gs3")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "playerCount")
  |> filter(fn: (r) => r["_field"] == "playerCount")
  |> filter(fn: (r) => r.name != "tf2" and r.name != "mc-vanilla2")
  |> drop(columns: ["_start", "_stop", "_measurement", "_field"])

Inactive = data 
  |> map(fn: (r) => ({r with inactive: if r._value == 0.0 then 0 else 1, name: strings.replace(v: r.name, t: "-Inactive", u: "", i: 1)}))
  |> drop(columns: ["_value"])

Online = data 
  |> map(fn: (r) => ({r with online: if r._value == 0.0 then 0 else 1, name: strings.replace(v: r.name, t: "-Online", u: "", i: 1)})) 
  |> drop(columns: ["_value"])

combined = join(tables: {inactive: Inactive, online: Online}, on: ["_time", "name"])
  |> map(fn: (r) => ({r with online: r.online - r.inactive}))
  |> filter(fn: (r) => r.online == 1)

join(tables: {table: combined, count: playerCount}, on: ["_time", "name"])
  |> reduce(identity: {_time: v.timeRangeStop, onlineWithPlayers: 0, onlineWithoutPlayer: 0}, fn: (r, accumulator) => ({
    onlineWithPlayers: accumulator.onlineWithPlayers + (if r._value != 0 then 1 else 0),
    onlineWithoutPlayer: accumulator.onlineWithoutPlayer + (if r._value == 0 then 1 else 0),
    _time: r._time
  }))
  |> drop(columns: ["name"])
