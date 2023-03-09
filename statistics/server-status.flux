data = from(bucket: "gs3")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "onlineInactiveStatus")
  |> filter(fn: (r) => r["_field"] == "value")

Inactive = data 
  |> filter(fn: (r) => r.name == "conan-Inactive") 
  |> map(fn: (r) => ({r with inactive: if r._value == 0.0 then 0 else 1})) 
  |> drop(columns: ["_value", "name", "_start", "_stop", "_measurement", "_field"])
  |> reduce(
    identity: {inactive: 0, _time: v.timeRangeStop},
    fn: (r, accumulator) => ({
      inactive: accumulator.inactive + r.inactive,
      _time: r._time
    })
  )

Online = data 
  |> filter(fn: (r) => r.name == "conan-Online") 
  |> map(fn: (r) => ({r with online: if r._value == 0.0 then 0 else 1})) 
  |> drop(columns: ["_value", "name", "_start", "_stop", "_measurement", "_field"])
  |> reduce(
    identity: {online: 0, offline: 0, _time: v.timeRangeStop},
    fn: (r, accumulator) => ({
      online: accumulator.online + r.online,
      offline: accumulator.offline + (if r.online == 0 then 1 else 0),
      _time: r._time
    })
  )

join(tables: {inactive: Inactive, online: Online}, on: ["_time"])
  |> map(fn: (r) => ({r with online: r.online - r.inactive}))
