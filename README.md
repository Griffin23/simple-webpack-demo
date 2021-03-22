# webpack原理（简易demo）

1. 从入口开始分析所有依赖项，广度遍历，生成依赖图（其实是个队列）
```
graph = queue[asset]

asset = {
    id: 1,
    filename: ''
    dependencies: [ ... child filename ... ],
    code: '',
    mapping: {
        'filename value': 'id value'
    }
}
```

2. 根据依赖图（队列），拼接代码模版，生成最终代码

## 运行

执行`node simplepack.js`会生成bundle.js；再执行`node bundle.js`可查看效果