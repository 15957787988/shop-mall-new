# AI 爆款视频接口文档

基础路径：`/admin-api/ai/shop/video`

## 1. 生成爆款视频
**接口路径**: `POST /generate`  
**接口描述**: 根据商品图、商品卖点、目标市场、语言、视频模板类型等信息，批量创建爆款视频生成任务。接口为异步生成，调用成功后返回视频记录 `id` 列表，前端可通过分页接口轮询生成状态。  
**请求头**: `Content-Type: application/json`

### 请求参数 (Body)
| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `productImages` | Array<String> | **是** | - | 商品图片 URL 列表，至少传 1 张 |
| `sellingPoints` | String | **是** | - | 商品卖点文案 |
| `country` | String | 否 | - | 目标国家/市场，例如：`美国` |
| `language` | String | 否 | - | 目标语言，例如：`英语` |
| `aspectRatio` | String | 否 | - | 视频比例，例如：`16:9`、`9:16` |
| `type` | Integer | **是** | - | 视频类型：`1-爆款视频`，`2-爆款复刻`。该接口通常传 `1` |
| `modelId` | Long | **是** | - | 视频模型 ID |
| `videoTypes` | Array<Object> | **是** | - | 需要生成的视频风格/模板列表 |

**`videoTypes` 字段说明：**
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `videoType` | Integer | **是** | 具体视频生成的子类型（风格/模板）取值是：101-108 |
| `count` | Integer | **是** | 当前风格生成数量，取值范围 `1 ~ 5` |

### 请求示例
```json
{
  "productImages": [
    "https://xxx.com/p1.jpg",
    "https://xxx.com/p2.jpg"
  ],
  "sellingPoints": "透气，轻便，适合夏季通勤",
  "country": "美国",
  "language": "英语",
  "aspectRatio": "16:9",
  "type": 1,
  "modelId": 1001,
  "videoTypes": [
    {
      "videoType": 3,
      "count": 2
    },
    {
      "videoType": 5,
      "count": 1
    }
  ]
}
```

### 响应示例
```json
{
  "code": 0,
  "data": [101, 102, 103],
  "msg": ""
}
```

### 响应说明
| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `code` | Integer | 返回码，`0` 表示成功 |
| `data` | Array<Long> | 本次创建成功的视频记录 ID 列表 |
| `msg` | String | 提示信息，成功时为空字符串 |

---

## 2. 爆款复刻
**接口路径**: `POST /replicate-write`  
**接口描述**: 基于商品图和参考视频创建 1 条“爆款复刻”视频任务。接口为异步生成，调用成功后返回视频记录 `id`，前端可通过分页接口轮询生成状态。  
**请求头**: `Content-Type: application/json`

### 请求参数 (Body)
| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `productImages` | Array<String> | **是** | - | 商品图片 URL 列表，至少传 1 张 |
| `referenceVideoUrl` | String | 否 | - | 参考视频 URL，传入后会作为复刻参考素材 |
| `country` | String | 否 | - | 目标国家/市场，例如：`美国` |
| `language` | String | 否 | - | 目标语言，例如：`英语` |
| `aspectRatio` | String | 否 | - | 视频比例，例如：`9:16` |
| `sellingPoints` | String | 否 | - | 商品卖点文案 |
| `modelId` | Long | **是** | - | 视频模型 ID |

### 请求示例
```json
{
  "productImages": [
    "https://xxx.com/p1.jpg",
    "https://xxx.com/p2.jpg"
  ],
  "referenceVideoUrl": "https://xxx.com/ref.mp4",
  "country": "美国",
  "language": "英语",
  "aspectRatio": "9:16",
  "sellingPoints": "轻量，防滑，适合户外运动",
  "modelId": 1001
}
```

### 响应示例
```json
{
  "code": 0,
  "data": 201,
  "msg": ""
}
```

### 响应说明
| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `code` | Integer | 返回码，`0` 表示成功 |
| `data` | Long | 新创建的视频记录 ID |
| `msg` | String | 提示信息，成功时为空字符串 |

---

## 3. 获得爆款视频分页
**接口路径**: `GET /page`  
**接口描述**: 查询当前登录用户自己的爆款视频任务分页列表，可用于历史记录展示和轮询任务进度。  

### 请求参数 (Query)
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `pageNo` | Integer | **是** | 页码，从 1 开始 |
| `pageSize` | Integer | **是** | 每页条数，最大 100 |
| `type` | Integer | 否 | 视频类型：`1-爆款视频`，`2-爆款复刻` |
| `videoType` | Integer | 否 | 具体视频生成的子类型（风格/模板） |
| `textStatus` | Integer | 否 | 文字模型状态 |
| `videoStatus` | Integer | 否 | 视频模型状态 |
| `createTime` | Array<String> | 否 | 创建时间范围，格式：`yyyy-MM-dd HH:mm:ss` |

### 请求示例
```http
GET /admin-api/ai/shop/video/page?pageNo=1&pageSize=10&type=1&videoStatus=20
```

### 时间范围示例
```http
GET /admin-api/ai/shop/video/page?pageNo=1&pageSize=10&createTime=2026-06-01 00:00:00&createTime=2026-06-25 23:59:59
```

### 响应字段说明 (`list` 对象)
| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | Long | 视频记录 ID |
| `videoType` | Integer | 具体视频风格/模板类型 |
| `videoUrl` | String | 最终生成的视频 URL，任务完成后有值 |
| `coverUrl` | String | 视频封面 URL，任务完成后有值 |
| `videoStatus` | Integer | 视频生成状态 |
| `finishTime` | String | 生成完成时间，未完成时可能为空 |

### 响应示例
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 101,
        "videoType": 3,
        "videoUrl": "https://oss.xxx.com/video/101.mp4",
        "coverUrl": "https://oss.xxx.com/video/101.jpg",
        "videoStatus": 20,
        "finishTime": "2026-06-25T15:30:22"
      }
    ],
    "total": 1
  },
  "msg": ""
}
```

---

## 4. 状态值说明
### 视频状态 `videoStatus`
| 状态值 | 含义 |
| :--- | :--- |
| `10` | 进行中 |
| `11` | 正在处理 |
| `20` | 已完成 |
| `30` | 已失败 |

### 视频类型 `type`
| 状态值 | 含义 |
| :--- | :--- |
| `1` | 爆款视频 |
| `2` | 爆款复刻 |

---

## 5. 前端联调建议
1. 调用 `/generate` 后拿到视频记录 ID 列表，调用 `/replicate-write` 后拿到单个视频记录 ID。
2. 两个写接口都是异步任务，提交成功仅表示任务已创建，不代表视频已经生成完成。
3. 建议每 3-5 秒调用一次 `/page` 接口，根据 `videoStatus` 更新前端界面。
4. 当 `videoStatus = 20` 时，可展示 `videoUrl` 和 `coverUrl`；当 `videoStatus = 30` 时，可提示生成失败。
5. `/generate` 和 `/replicate-write` 都有限流，同一用户 10 秒内最多调用 1 次，超限时后端提示：`您操作过于频繁，请等待10秒后再试`。

---

## 6. 注意事项
1. 前端不需要传 `userId`，分页接口会自动按当前登录用户过滤数据。
2. `modelId` 虽然在部分请求类里未直接加校验注解，但实际业务中必须传，不传会导致后端报错。
3. `/generate` 返回的是视频记录 ID 列表，`/replicate-write` 返回的是单个视频记录 ID，二者都不是第三方平台任务号。
