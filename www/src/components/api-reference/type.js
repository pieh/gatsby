// import React from "react"
// import { graphql } from "gatsby"

// const TypeComponent = ({ type }) => {
//   if (type.type === `NameExpression`) {
//     return <span>{type.name}</span>
//   } else if (type.type === `UnionType`) {
//     return (
//       <span>
//         TO-DO (
//         {type.elements.map(element => (
//           <TypeComponent type={element} />
//         ))}
//         )
//       </span>
//     )
//   } else if (type.type === `TypeApplication` && type.expression) {
//     // special case for Array
//     // if (type.expression.name === `Array`) {
//     //   return `${typeToString(type.applications[0])}[]`
//     // } else {
//     //   return `${typeToString(type.expression)}<${type.applications
//     //     .map(typeToString)
//     //     .join(`,`)}>`
//     // }
//   }
//   return null
// }

// export default TypeComponent

// export const fragment = graphql`
//   fragment DocumentationTypeFragment on DocumentationJs {
//     type {
//       name
//       type
//       elements {
//         name
//         type
//       }
//       expression {
//         type
//         name
//       }
//       applications {
//         type
//         name
//       }
//     }
//   }
// `
