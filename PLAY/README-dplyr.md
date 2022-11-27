# Javascript dataframe libraries

Great overview from 2015: 

https://stackoverflow.com/questions/30610675/python-pandas-equivalent-in-javascript

## 2022 options

### arquero

_From UW Interactive Data Lab!_

Started in 2021. Slowed down in 2022.

Watch 25, Fork 46, Star 962
Used by 94, Contributors 13

* https://github.com/uwdata/arquero

Based on Apache Arrow. Inspired by dplyr.

Simple web page example:
* https://github.com/uwdata/arquero-worker/blob/main/docs/example/index.html

Too half a day to figure out how to filter but now it's working.

### dataframe-js

Started in 2017. No releases since 2020.

Watch 18, Fork 38, Star 432
Used by 398, Contributors 7

* https://github.com/Gmousse/dataframe-js
* https://gmousse.gitbooks.io/dataframe-js/content/#dataframe-js

Pretty performant and straightforward to use after a day's play. The author
appears to be an extremely smart javascript developer -- lots of low level
stuff that works amazingly well but that I barely understand.

Ugh! Ate up 100% of CPU for quite sime time when I tried to convert negative
values to zero.

Not so performant after all!


### Danfo.js

Started in 2020. Regular recent releases.

Watch 31, Fork 171, Star 3.9k
Used by 236, Contributors 33

* https://danfo.jsdata.org

Seems a little bloated with functionality we don't need and not that easy to use
at first glance.



### tidy.js

Started in 2021. Slowed down in 2022.

Watch 11, Fork 20, Star 609
Used by 107, Contributors 8

* https://pbeshai.github.io/tidy/

Inspired by dplyr and tidyr.

Looks to be very focused on mimicking **dplyr** and **tidyr** verbs and 
functionality. No support for ingesting data so would need to use Papaparse
for data ingest. Doesn't look like it was designed to be performant.