# base url

http://192.168.0.1

# /v1/ping

## method

GET

## return

```json
{
  "errCode" : 200,
  "errMsg" : "OK",
  "datetime" : "2018-09-06T20:46:48"
}
```

# /v1/lens/focus/lock

## method

POST

## return

```json
{
  "errCode" : 200,
  "errMsg" : "OK",
  "focused" : false,
  "focusLocked" : false
}
```

# /v1/lens/focus/unlock

## method

POST

## return

```json
{
  "errCode": 412,
  "errMsg": "Precondition Failed"
}
```

# /_gr

## method

POST(form data)

## params

### cmd

`bdial M`
`bdial MY2`
`uilock on`

## return

```json
{
  "errCode" : 200,
  "errMsg" : "OK",
  "cmd" : "uilock on",
  "retCode" : 0,
  "retStr" : ""
}
```

# /v1/constants/device

## method

GET

## return

```ts
interface Device {
  errCode:number;
  errMsg: "OK";
  model: "GR II";
  firmwareVersion: string;
  macAddress: string;
  serialNo: string;
  channelList: number[];
}
```


# /v1/photos/<path>

## method

GET

## params

### size

* `view`
* `thumb`

## return

jpeg data.


# File list

`/_gr/objs`

## method

GET

## returns

```typescript
interface Objs {
  errCode: number;
  errMsg: "OK"
  dirs: Dir[];
}

interface Dir {
  name: string;
  files: File[];
}

interface File {
  n: string;
  o: number; // ??
  s: "LF"; // ??
  d: Date;
}
```

# Live View

only screen: `/v1/liveview`
with monitor indicator: `/v1/display`

## method

GET?

## return

Streaming jpeg data?