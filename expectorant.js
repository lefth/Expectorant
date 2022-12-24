/* Business logic for Expectorant

First is the spinpick function for randomly choosing from a list of things with
corresponding weights, which we normalize to probabilities.

Next we have the syntactic sugar for two use cases for expectorant:

1. Colon-syntax for computing probabilities for restaurant bill splitting based
on the subtotal and amounts for things people ordered.

2. At-syntax for when you owe someone some inconvenient amount of money like
$7.52 and you want the probabilities that you should pay them one of two 
convenient amounts like $5 and $20. (Answer: pay $5 with 83% probability and $20
with 17%.)

Both of those are done in the desugar function, which turns our notation with ':'
and '@' into arithmetic expressions that evaluate to probabilities.

Finally, we have the parsefrac function for doing that evaluation and getting
an actual number. 

Finally-finally, we have a tidyround function for displaying the parsed
probability in a non-gross way.
*/

const round = Math.round

function percentify(x) { return round(100*x) + "%" }

// Renormalize a list of weights to sum to 1
function renorm(w) {
  const tot = w.reduce((a,b)=>a+b)
  return w.map(x=>x/tot)
}

// Return a list of the cumulative sums of l. Eg, [1,2,3] -> [1,3,6]
function accum(l) {
  let s = 0
  return l.map(x => { s += x; return s })
}

// Take a number p in [0,1] and list of non-negative weights w and return the
// (0-based) index of the appropriate weight. Eg, if the weights are [99, 1]
// then for all p up to .99 this will return 0 and for .99 < p <= 1 it return 1.
function spinHelper(p, w) {
  const cp = accum(renorm(w)) // cumulative probabilities, ending with 1
  for (let i = 0; i < w.length; i++) { if (p < cp[i]) return i }
  return -1 // something went horribly wrong if we reach this line
}

// Randomly return an element of the list l, weighted by w.
// Eg, spinpick(["a","b","c"], [1,2,1]) returns "a" w/ p=.25, "b" w/ p=.5 etc
function spinpick(l, w) { return l[spinHelper(Math.random(), w)] }

/* Testing spinpick -- seems rock solid for lots of sample probabilities
sum = 0;
p = .123;
for (let i=0; i<1e7; i++) { sum += spinpick([0,1], [p, 1-p]) }
1 - sum/1e7 // should match p pretty closely
*/

// Eval but just return null if syntax error.
// Obviously don't use serverside with user-supplied input.
function laxeval(s) {
  try {
    const x = eval(s)
    return typeof x === "undefined" ? null : x
  } catch (e) {
    return null
  }
}

function parsefrac(s) {
  s = s.replace(/^([^\%]*)\%(.*)$/, "($1)/100$2")
  const x = laxeval(s)
  return x === null ? NaN : x
}

// Macro-expand the syntactic sugar with `@` and `:`, namely:
//  * convert "t@a,b" to "((t)-(a))/((b)-(a))"
//  * convert "s:a,b,c" (any # of comma-separated items) to "(c)/((s)-(a)-(b))"
function desugar(s) {
  // "x @ a,b" -- x and a and b can be expressions
  if (s.match(/^[^@,:]+@[^@,:]+,[^@,:]+$/))
    s = s.replace(/^\s*([^@,]+)\s*@\s*([^,]+),([^,]+)\s*$/,
                  '(($1)-($2))/((($3)-($2)))')
  // "s : a,b,c,..." -- for dinner bill splitting
  else if (s.match(/^[^:,]+:[^:]+$/)) {
    const ss = s.split(/[:,]/)
    const n = ss.length
    s = '('+ss[n-1]+')/(('+ss[0]+')'
    if (n >= 3) {
      for (let i = 1; i <= n-3; i++) s += '-('+ss[i]+')'
      s += '-(' + ss[n-2] + ')'
    }
    s += ')'
  }
  return s
}

// Round x to dp decimal places. 
// You might think we could use toFixed() or toPrecision() here but they show a
// bunch of ugly trailing zeros.
function roundp(x, dp=0) { return round(x*10**dp)/10**dp }
